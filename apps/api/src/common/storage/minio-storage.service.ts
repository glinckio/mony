import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { ConfigService } from "@nestjs/config";

import { StorageService } from "./storage.service";

const SIGNING_WINDOW_SECONDS = 30 * 60;

// MinIO through its S3-compatible API. Two clients on purpose: uploads
// and deletes go to MINIO_ENDPOINT (reachable from the API), while signed
// URLs are minted for MINIO_PUBLIC_ENDPOINT — the host the phone can
// actually reach (e.g. the dev machine's LAN IP). Presigning is a local
// HMAC computation, so the second client never makes a network call, and
// the host is part of the signature, so it must be the public one.
export class MinioStorageService extends StorageService {
  private readonly client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;
  private readonly signedUrlCache = new Map<string, string>();
  private cachedWindowStart = 0;

  constructor(config: ConfigService) {
    super();
    const endpoint = config.getOrThrow<string>("MINIO_ENDPOINT");
    const publicEndpoint = config.get<string>("MINIO_PUBLIC_ENDPOINT") || endpoint;
    const credentials = {
      accessKeyId: config.getOrThrow<string>("MINIO_ACCESS_KEY"),
      secretAccessKey: config.getOrThrow<string>("MINIO_SECRET_KEY"),
    };
    // MinIO ignores the region, but the SDK requires one to sign.
    const common = { region: "us-east-1", forcePathStyle: true, credentials };

    this.client = new S3Client({ ...common, endpoint });
    this.signingClient = new S3Client({ ...common, endpoint: publicEndpoint });
    this.bucket = config.getOrThrow<string>("MINIO_BUCKET");
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  // Signed as of the start of a fixed window, not "now": within a window
  // every response carries the SAME URL for an object, so the phone's
  // image cache (keyed by full URL) hits instead of re-downloading the
  // photo on every refetch. A URL is valid for ttl .. ttl + window.
  // Objects are immutable (fresh key per upload), hence the cache header.
  //
  // Within a window the URL for a key is always the same, so it's cached:
  // presigning costs ~1 ms of event-loop CPU per URL, and list responses
  // (vehicles, maintenance history) mint one per item on every fetch. The
  // cache is dropped whenever the window changes, so it never grows past
  // one window's worth of keys.
  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    const windowMs = SIGNING_WINDOW_SECONDS * 1000;
    const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
    if (windowStart !== this.cachedWindowStart) {
      this.signedUrlCache.clear();
      this.cachedWindowStart = windowStart;
    }
    const cacheKey = `${ttlSeconds}|${key}`;
    const cached = this.signedUrlCache.get(cacheKey);
    if (cached) return cached;

    const signingDate = new Date(windowStart);
    const url = await getSignedUrl(
      this.signingClient,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseCacheControl: "private, max-age=86400, immutable",
      }),
      {
        expiresIn: ttlSeconds + SIGNING_WINDOW_SECONDS,
        signingDate,
      },
    );
    this.signedUrlCache.set(cacheKey, url);
    return url;
  }

  async delete(key: string): Promise<void> {
    // S3 DeleteObject succeeds for a missing key — idempotent as required.
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  // List (1000 keys per page) and batch-delete until the prefix is empty.
  async deletePrefix(prefix: string): Promise<void> {
    let continuationToken: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      const objects = (page.Contents ?? []).flatMap((object) =>
        object.Key ? [{ Key: object.Key }] : [],
      );
      if (objects.length > 0) {
        const result = await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
        // A batch delete "succeeds" even when some keys fail — this sweep
        // is how deleted personal data gets erased, so surface them.
        if (result.Errors?.length) {
          throw new Error(
            `Couldn't delete ${result.Errors.length} object(s) under ${prefix}: ${result.Errors.map((error) => `${error.Key} (${error.Code})`).join(", ")}`,
          );
        }
      }
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  }
}
