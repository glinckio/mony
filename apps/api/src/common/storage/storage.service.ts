// Private object storage (vehicle photos now, maintenance receipts next).
// Nothing stored here is public: callers persist the object KEY and hand
// clients a short-lived signed URL instead — see
// docs/specs/vehicles/design.md "Storage".
export abstract class StorageService {
  abstract put(key: string, body: Buffer, contentType: string): Promise<void>;
  abstract getSignedUrl(key: string, ttlSeconds: number): Promise<string>;
  // Idempotent: deleting a missing key is not an error.
  abstract delete(key: string): Promise<void>;
  // Removes every object whose key starts with `prefix` (e.g. everything
  // under one vehicle) — sweeps up objects a best-effort delete or a lost
  // race left behind, so deleted personal data doesn't linger.
  abstract deletePrefix(prefix: string): Promise<void>;
}
