import { Logger } from "@nestjs/common";

import { StorageService } from "./storage.service";

interface StoredObject {
  body: Buffer;
  contentType: string;
}

// In-process storage for tests (no MinIO needed) and for local dev when
// MINIO_ENDPOINT isn't configured — objects vanish on restart and the
// "signed URL" isn't fetchable. Never used in production (see
// StorageModule).
export class MemoryStorageService extends StorageService {
  private readonly logger = new Logger(MemoryStorageService.name);
  readonly objects = new Map<string, StoredObject>();

  constructor(warn = false) {
    super();
    if (warn) {
      this.logger.warn(
        "MINIO_ENDPOINT not set — using in-memory storage. Uploaded photos won't persist or be viewable.",
      );
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType });
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<string> {
    return `memory://${key}?ttl=${ttlSeconds}`;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async deletePrefix(prefix: string): Promise<void> {
    for (const key of [...this.objects.keys()]) {
      if (key.startsWith(prefix)) this.objects.delete(key);
    }
  }
}
