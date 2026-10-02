import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Logger } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";

import { StorageService } from "./storage.service";

const SIGNING_WINDOW_SECONDS = 30 * 60;

// One line with everything that tells storage failures apart: the SDK's
// error name/code, the HTTP status MinIO (or the proxy in front of it)
// answered, and Node's network code (ECONNREFUSED, ENOTFOUND, a TLS
// error…) when the request never got an answer.
export function describeS3Error(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const details = error as Error & {
    Code?: string;
    code?: string;
    $metadata?: { httpStatusCode?: number };
    cause?: { code?: string };
  };
  const status = details.$metadata?.httpStatusCode;
  return [
    details.name,
    details.Code !== details.name ? details.Code : undefined,
    details.code ?? details.cause?.code,
    status ? `HTTP ${status}` : undefined,
    details.message,
  ]
    .filter(Boolean)
    .join(" · ");
}

// MinIO through its S3-compatible API. Two clients on purpose: uploads
// and deletes go to MINIO_ENDPOINT (reachable from the API), while signed
// URLs are minted for MINIO_PUBLIC_ENDPOINT — the host the phone can
// actually reach (e.g. the dev machine's LAN IP). Presigning is a local
// HMAC computation, so the second client never makes a network call, and
// the host is part of the signature, so it must be the public one.
export class MinioStorageService extends StorageService {
  private readonly logger = new Logger("MinioStorage");
  private readonly client: S3Client;
  private readonly signingClient: S3Client;
  private readonly bucket: string;
  // Host only, for logs — never the credentials.
  private readonly endpointHost: string;
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
    this.endpointHost = URL.canParse(endpoint) ? new URL(endpoint).host : endpoint;
  }

  // Run once at boot: a wrong endpoint, bucket, key or policy shows up in
  // the deploy log right away instead of on the first upload. Never
  // throws — storage being down shouldn't keep the rest of the API from
  // starting. HTTP 403 = credentials or policy, 404 = no such bucket.
  async checkConnection(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Connected to ${this.endpointHost}, bucket "${this.bucket}"`);
    } catch (error) {
      this.logger.error(
        `Can't reach bucket "${this.bucket}" at ${this.endpointHost}: ${describeS3Error(error)}`,
      );
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch (error) {
      // The request's 500 log has the stack; this says where it was going.
      this.logger.error(
        `Upload to bucket "${this.bucket}" at ${this.endpointHost} failed: ${describeS3Error(error)}`,
      );
      throw error;
    }
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
