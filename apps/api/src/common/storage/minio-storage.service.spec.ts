import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
  type DeleteObjectsCommandOutput,
  type ListObjectsV2CommandOutput,
} from "@aws-sdk/client-s3";
import type { ConfigService } from "@nestjs/config";

import { MinioStorageService } from "./minio-storage.service";

// Counts real presigning work (the signed-URL cache must skip it) while
// still producing real URLs.
const mockPresignedKeys: string[] = [];
jest.mock("@aws-sdk/s3-request-presigner", () => {
  const actual = jest.requireActual<typeof import("@aws-sdk/s3-request-presigner")>(
    "@aws-sdk/s3-request-presigner",
  );
  return {
    ...actual,
    getSignedUrl: (...args: Parameters<typeof actual.getSignedUrl>) => {
      mockPresignedKeys.push(String((args[1].input as { Key?: string }).Key));
      return actual.getSignedUrl(...args);
    },
  };
});

// Presigning is a local HMAC computation — no MinIO needs to be running.
function buildConfig(values: Record<string, string | undefined>): ConfigService {
  return {
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      const value = values[key];
      if (value === undefined) throw new Error(`Missing ${key}`);
      return value;
    },
  } as unknown as ConfigService;
}

const baseConfig = {
  MINIO_ENDPOINT: "http://minio:9010",
  MINIO_ACCESS_KEY: "mony-access",
  MINIO_SECRET_KEY: "mony-secret-key",
  MINIO_BUCKET: "mony",
};

// X-Amz-Date (YYYYMMDDTHHMMSSZ) + X-Amz-Expires → expiry epoch ms.
function expiresAt(url: URL): number {
  const d = url.searchParams.get("X-Amz-Date")!;
  const signedAt = Date.UTC(
    Number(d.slice(0, 4)),
    Number(d.slice(4, 6)) - 1,
    Number(d.slice(6, 8)),
    Number(d.slice(9, 11)),
    Number(d.slice(11, 13)),
    Number(d.slice(13, 15)),
  );
  return signedAt + Number(url.searchParams.get("X-Amz-Expires")) * 1000;
}

describe("MinioStorageService", () => {
  beforeEach(() => {
    mockPresignedKeys.length = 0;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("getSignedUrl", () => {
    it("mints a signed, path-style URL on the phone-reachable public endpoint", async () => {
      const storage = new MinioStorageService(
        buildConfig({ ...baseConfig, MINIO_PUBLIC_ENDPOINT: "http://192.168.0.10:9010" }),
      );

      const url = new URL(await storage.getSignedUrl("vehicles/user-1/veh-1/abc.jpg", 3600));

      expect(url.origin).toBe("http://192.168.0.10:9010");
      expect(url.pathname).toBe("/mony/vehicles/user-1/veh-1/abc.jpg");
      expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
      expect(url.searchParams.get("X-Amz-Credential")).toMatch(/^mony-access\//);
      expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
      // The secret never leaks into the URL.
      expect(url.toString()).not.toContain("mony-secret-key");
    });

    it("stays valid for at least the requested TTL, and at most 30 minutes more (short-lived)", async () => {
      const storage = new MinioStorageService(buildConfig(baseConfig));
      const ttl = 3600;

      for (const now of [
        Date.UTC(2026, 8, 25, 12, 0, 0),
        Date.UTC(2026, 8, 25, 12, 17, 42),
        Date.UTC(2026, 8, 25, 12, 29, 59),
      ]) {
        jest.spyOn(Date, "now").mockReturnValue(now);
        const remainingMs = expiresAt(new URL(await storage.getSignedUrl("k.jpg", ttl))) - now;
        expect(remainingMs).toBeGreaterThanOrEqual(ttl * 1000);
        expect(remainingMs).toBeLessThanOrEqual((ttl + 30 * 60) * 1000);
      }
    });

    it("returns the same URL for an object within a signing window, so the app's image cache hits", async () => {
      const storage = new MinioStorageService(buildConfig(baseConfig));
      const now = jest.spyOn(Date, "now");

      now.mockReturnValue(Date.UTC(2026, 8, 25, 12, 1, 0));
      const first = await storage.getSignedUrl("k.jpg", 3600);
      now.mockReturnValue(Date.UTC(2026, 8, 25, 12, 14, 30));
      const second = await storage.getSignedUrl("k.jpg", 3600);
      now.mockReturnValue(Date.UTC(2026, 8, 25, 14, 0, 0));
      const later = await storage.getSignedUrl("k.jpg", 3600);

      expect(second).toBe(first);
      expect(later).not.toBe(first);
      expect(await storage.getSignedUrl("other.jpg", 3600)).not.toBe(later);
    });

    describe("signed-URL cache", () => {
      // Only the clock is faked: the SDK's own promise plumbing stays real.
      const useClock = (now: number) =>
        jest.useFakeTimers({ now, doNotFake: ["nextTick", "queueMicrotask", "setImmediate"] });

      it("presigns an object once per signing window, then serves the cached URL", async () => {
        const storage = new MinioStorageService(buildConfig(baseConfig));
        useClock(Date.UTC(2026, 8, 25, 12, 0, 0));

        const first = await storage.getSignedUrl("receipts/a.pdf", 3600);
        jest.setSystemTime(Date.UTC(2026, 8, 25, 12, 14, 30));
        const again = await storage.getSignedUrl("receipts/a.pdf", 3600);
        jest.setSystemTime(Date.UTC(2026, 8, 25, 12, 29, 59, 999));
        const lastMoment = await storage.getSignedUrl("receipts/a.pdf", 3600);

        expect(again).toBe(first);
        expect(lastMoment).toBe(first);
        expect(mockPresignedKeys).toEqual(["receipts/a.pdf"]);
      });

      it("keeps objects and TTLs apart: a different key or TTL is its own URL", async () => {
        const storage = new MinioStorageService(buildConfig(baseConfig));
        useClock(Date.UTC(2026, 8, 25, 12, 5, 0));

        const receipt = await storage.getSignedUrl("receipts/a.pdf", 3600);
        const photo = await storage.getSignedUrl("photos/b.jpg", 3600);
        const shortLived = new URL(await storage.getSignedUrl("receipts/a.pdf", 600));

        expect(new URL(receipt).pathname).toBe("/mony/receipts/a.pdf");
        expect(new URL(photo).pathname).toBe("/mony/photos/b.jpg");
        // A TTL never gets another TTL's (longer-lived) URL from the cache.
        expect(shortLived.toString()).not.toBe(receipt);
        expect(shortLived.searchParams.get("X-Amz-Expires")).toBe(String(600 + 30 * 60));
        expect(new URL(receipt).searchParams.get("X-Amz-Expires")).toBe(String(3600 + 30 * 60));
        expect(mockPresignedKeys).toHaveLength(3);
      });

      it("re-signs once the window rolls over, dropping the previous window's URLs", async () => {
        const storage = new MinioStorageService(buildConfig(baseConfig));
        useClock(Date.UTC(2026, 8, 25, 12, 29, 59));
        const before = await storage.getSignedUrl("receipts/a.pdf", 3600);
        await storage.getSignedUrl("receipts/b.pdf", 3600);

        jest.setSystemTime(Date.UTC(2026, 8, 25, 12, 30, 0));
        const after = new URL(await storage.getSignedUrl("receipts/a.pdf", 3600));

        expect(after.toString()).not.toBe(before);
        // Signed as of the new window's start, so it stays valid ttl..ttl+30 min.
        expect(after.searchParams.get("X-Amz-Date")).toBe("20260925T123000Z");
        expect(mockPresignedKeys).toEqual(["receipts/a.pdf", "receipts/b.pdf", "receipts/a.pdf"]);
        // Memory stays bounded by one window's worth of keys.
        expect(storage["signedUrlCache"].size).toBe(1);
      });
    });

    it("falls back to MINIO_ENDPOINT when no public endpoint is configured", async () => {
      const storage = new MinioStorageService(buildConfig(baseConfig));

      const url = new URL(await storage.getSignedUrl("k.png", 3600));

      expect(url.origin).toBe("http://minio:9010");
      expect(url.pathname).toBe("/mony/k.png");
    });
  });

  describe("deletePrefix", () => {
    type Command = ListObjectsV2Command | DeleteObjectsCommand;

    // The data-plane client is stubbed at `send`; each command is recorded.
    function stubS3(
      pages: Array<Partial<ListObjectsV2CommandOutput>>,
      deleteResult: Partial<DeleteObjectsCommandOutput> = {},
    ) {
      const sent: Command[] = [];
      let page = 0;
      jest.spyOn(S3Client.prototype, "send").mockImplementation((async (command: Command) => {
        sent.push(command);
        if (command instanceof ListObjectsV2Command) return pages[page++];
        return deleteResult;
      }) as never);
      return sent;
    }

    it("lists page by page and batch-deletes every object under the prefix", async () => {
      const sent = stubS3([
        {
          Contents: [{ Key: "vehicles/u/v/a.jpg" }, { Key: "vehicles/u/v/b.pdf" }, {}],
          IsTruncated: true,
          NextContinuationToken: "page-2",
        },
        { Contents: [{ Key: "vehicles/u/v/c.jpg" }], IsTruncated: false },
      ]);
      const storage = new MinioStorageService(buildConfig(baseConfig));

      await storage.deletePrefix("vehicles/u/v/");

      expect(sent.map((command) => command.constructor.name)).toEqual([
        "ListObjectsV2Command",
        "DeleteObjectsCommand",
        "ListObjectsV2Command",
        "DeleteObjectsCommand",
      ]);
      expect(sent[0]!.input).toEqual({
        Bucket: "mony",
        Prefix: "vehicles/u/v/",
        ContinuationToken: undefined,
      });
      expect(sent[1]!.input).toEqual({
        Bucket: "mony",
        Delete: {
          Objects: [{ Key: "vehicles/u/v/a.jpg" }, { Key: "vehicles/u/v/b.pdf" }],
          Quiet: true,
        },
      });
      expect(sent[2]!.input).toMatchObject({ ContinuationToken: "page-2" });
      expect(sent[3]!.input).toMatchObject({
        Delete: { Objects: [{ Key: "vehicles/u/v/c.jpg" }] },
      });
    });

    it("sends no delete when nothing is stored under the prefix", async () => {
      const sent = stubS3([{ IsTruncated: false }]);
      const storage = new MinioStorageService(buildConfig(baseConfig));

      await storage.deletePrefix("vehicles/u/empty/");

      expect(sent).toHaveLength(1);
      expect(sent[0]).toBeInstanceOf(ListObjectsV2Command);
    });

    it("throws, naming each key, when a batch delete reports per-object errors", async () => {
      const sent = stubS3(
        [
          {
            Contents: [{ Key: "vehicles/u/v/a.jpg" }, { Key: "vehicles/u/v/b.pdf" }],
            IsTruncated: true,
            NextContinuationToken: "page-2",
          },
        ],
        { Errors: [{ Key: "vehicles/u/v/b.pdf", Code: "AccessDenied" }] },
      );
      const storage = new MinioStorageService(buildConfig(baseConfig));

      // An HTTP 200 with errors inside still means personal data survived.
      await expect(storage.deletePrefix("vehicles/u/v/")).rejects.toThrow(
        "Couldn't delete 1 object(s) under vehicles/u/v/: vehicles/u/v/b.pdf (AccessDenied)",
      );
      // It stops there instead of silently moving on to the next page.
      expect(sent).toHaveLength(2);
    });
  });

  it("refuses to start without credentials or a bucket", () => {
    expect(
      () => new MinioStorageService(buildConfig({ ...baseConfig, MINIO_SECRET_KEY: undefined })),
    ).toThrow("MINIO_SECRET_KEY");
    expect(
      () => new MinioStorageService(buildConfig({ ...baseConfig, MINIO_BUCKET: undefined })),
    ).toThrow("MINIO_BUCKET");
  });
});
