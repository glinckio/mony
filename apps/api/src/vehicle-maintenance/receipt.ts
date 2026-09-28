import type { MaintenanceReceiptKind } from "@mony/shared-types";
import { BadRequestException } from "@nestjs/common";

import { detectImageType } from "../common/storage/image-type";
import { normalizePhoto } from "../common/storage/normalize-photo";

export interface PreparedReceipt {
  body: Buffer;
  contentType: "image/jpeg" | "application/pdf";
  extension: "jpg" | "pdf";
}

// Longer side kept for receipt images: an invoice photo (often a tall
// thermal receipt) must stay legible, so more than a vehicle photo's
// 1600 px. The app uploads at this size too.
export const MAX_RECEIPT_DIMENSION = 2560;

const PDF_HEADER = "%PDF-";
// A complete PDF ends with "%%EOF" (optionally followed by a line break
// or a little padding); checking the tail rejects truncated uploads.
const PDF_TRAILER = "%%EOF";
const PDF_TRAILER_WINDOW = 1024;

export function isPdf(buffer: Buffer): boolean {
  if (buffer.length < PDF_HEADER.length + PDF_TRAILER.length) return false;
  if (buffer.toString("latin1", 0, PDF_HEADER.length) !== PDF_HEADER) return false;
  const tail = buffer.toString("latin1", Math.max(0, buffer.length - PDF_TRAILER_WINDOW));
  return tail.includes(PDF_TRAILER);
}

// Cheap content check (magic bytes only) — run before any database work.
export function sniffReceipt(buffer: Buffer): "IMAGE" | "PDF" | null {
  if (detectImageType(buffer)) return "IMAGE";
  if (isPdf(buffer)) return "PDF";
  return null;
}

// A maintenance receipt, sniffed from its content (legacy's form accepted
// .jpg/.jpeg/.png/.pdf; the declared type and file name prove nothing):
// - images are decoded and re-encoded like vehicle photos — metadata
//   (EXIF/GPS) gone, only pixels survive;
// - PDFs are stored as uploaded (the user's own invoice, private storage).
// Anything else is a 400.
export async function prepareReceipt(buffer: Buffer): Promise<PreparedReceipt> {
  const kind = sniffReceipt(buffer);
  if (kind === "IMAGE") {
    try {
      const photo = await normalizePhoto(buffer, {
        maxDimension: MAX_RECEIPT_DIMENSION,
        mozjpeg: false,
      });
      return { body: photo.body, contentType: photo.contentType, extension: photo.extension };
    } catch {
      throw new BadRequestException("Receipt couldn't be read as an image.");
    }
  }
  if (kind === "PDF") {
    return { body: buffer, contentType: "application/pdf", extension: "pdf" };
  }
  throw invalidReceipt();
}

export function invalidReceipt(): BadRequestException {
  return new BadRequestException("Receipt must be a JPEG, PNG or WebP image, or a PDF.");
}

export function receiptKind(key: string): MaintenanceReceiptKind {
  return key.endsWith(".pdf") ? "PDF" : "IMAGE";
}
