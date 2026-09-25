import type { ConfigService } from "@nestjs/config";

import { MinioStorageService } from "./minio-storage.service";

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
  afterEach(() => {
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

    it("falls back to MINIO_ENDPOINT when no public endpoint is configured", async () => {
      const storage = new MinioStorageService(buildConfig(baseConfig));

      const url = new URL(await storage.getSignedUrl("k.png", 3600));

      expect(url.origin).toBe("http://minio:9010");
      expect(url.pathname).toBe("/mony/k.png");
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
