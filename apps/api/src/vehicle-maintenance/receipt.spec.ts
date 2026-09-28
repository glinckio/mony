import { BadRequestException } from "@nestjs/common";
import sharp from "sharp";

import { MAX_RECEIPT_DIMENSION, isPdf, prepareReceipt, receiptKind, sniffReceipt } from "./receipt";

const PDF = Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\n%%EOF\r\n");

describe("receipt", () => {
  it("recognizes a complete PDF, with trailing line breaks or padding", () => {
    expect(isPdf(PDF)).toBe(true);
    expect(isPdf(Buffer.concat([PDF, Buffer.alloc(200, 0x20)]))).toBe(true);
  });

  it("rejects a truncated PDF, a PDF header elsewhere, and tiny buffers", () => {
    expect(isPdf(PDF.subarray(0, 20))).toBe(false);
    expect(isPdf(Buffer.concat([Buffer.from(" "), PDF]))).toBe(false);
    expect(isPdf(Buffer.from("%PDF-"))).toBe(false);
    // "%%EOF" far from the end doesn't count.
    expect(isPdf(Buffer.concat([PDF, Buffer.alloc(2048, 0x41)]))).toBe(false);
  });

  it("sniffs by content, never by name", () => {
    expect(sniffReceipt(PDF)).toBe("PDF");
    expect(sniffReceipt(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe("IMAGE");
    expect(sniffReceipt(Buffer.from("<svg/>"))).toBeNull();
  });

  it("re-encodes images as metadata-free JPEG and keeps PDFs as uploaded", async () => {
    const png = await sharp({
      create: { width: 20, height: 10, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
    })
      .withMetadata({ exif: { IFD0: { Copyright: "secret" } } })
      .png()
      .toBuffer();

    const image = await prepareReceipt(png);
    expect(image).toMatchObject({ contentType: "image/jpeg", extension: "jpg" });
    expect((await sharp(image.body).metadata()).exif).toBeUndefined();

    expect(await prepareReceipt(PDF)).toEqual({
      body: PDF,
      contentType: "application/pdf",
      extension: "pdf",
    });
  });

  it("keeps more pixels than a vehicle photo, so small print stays legible", async () => {
    // A tall thermal receipt.
    const photo = await sharp({
      create: { width: 900, height: 4000, channels: 3, background: { r: 250, g: 250, b: 250 } },
    })
      .png()
      .toBuffer();

    const image = await prepareReceipt(photo);

    const metadata = await sharp(image.body).metadata();
    expect(metadata.height).toBe(MAX_RECEIPT_DIMENSION);
    expect(metadata.width).toBe(576);
  });

  it("answers 400 for anything else, including an undecodable image", async () => {
    await expect(prepareReceipt(Buffer.from("plain text"))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(prepareReceipt(Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]))).rejects.toThrow(
      "Receipt couldn't be read as an image.",
    );
  });

  it("derives the kind from the stored key", () => {
    expect(receiptKind("vehicles/u/v/maintenance/r/x.pdf")).toBe("PDF");
    expect(receiptKind("vehicles/u/v/maintenance/r/x.jpg")).toBe("IMAGE");
  });
});
