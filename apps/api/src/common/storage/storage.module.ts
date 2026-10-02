import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { MemoryStorageService } from "./memory-storage.service";
import { MinioStorageService } from "./minio-storage.service";
import { StorageService } from "./storage.service";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: StorageService,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Tests never touch real storage.
        if (process.env.NODE_ENV === "test") {
          return new MemoryStorageService();
        }
        const endpoint = config.get<string>("MINIO_ENDPOINT");
        if (!endpoint) {
          // Same rule as the mailer: a missing storage config in
          // production is a deployment error, not a silent degrade.
          if (process.env.NODE_ENV === "production") {
            throw new Error("MINIO_ENDPOINT must be set in production.");
          }
          return new MemoryStorageService(true);
        }
        if (process.env.NODE_ENV === "production") {
          // Photos (personal data) and their signed URLs must never travel
          // in clear text (LGPD art. 46).
          const publicEndpoint = config.get<string>("MINIO_PUBLIC_ENDPOINT") || endpoint;
          if (![endpoint, publicEndpoint].every((url) => url.startsWith("https://"))) {
            throw new Error(
              "MINIO_ENDPOINT and MINIO_PUBLIC_ENDPOINT must use https:// in production.",
            );
          }
        }
        const storage = new MinioStorageService(config);
        void storage.checkConnection();
        return storage;
      },
    },
  ],
  exports: [StorageService],
})
export class StorageModule {}
