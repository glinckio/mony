import sharp from "sharp";

import { MAX_PHOTO_DIMENSION, normalizePhoto } from "./normalize-photo";

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .png()
    .toBuffer();

describe("normalizePhoto", () => {
  it("defaults to vehicle photos: capped at 1600 px, mozjpeg (progressive) encoding", async () => {
    const photo = await normalizePhoto(await png(3000, 1500));

    const metadata = await sharp(photo.body).metadata();
    expect(photo).toMatchObject({ contentType: "image/jpeg", extension: "jpg" });
    expect(metadata.format).toBe("jpeg");
    expect([metadata.width, metadata.height]).toEqual([MAX_PHOTO_DIMENSION, 800]);
    expect(metadata.isProgressive).toBe(true);
  });

  it("honors a larger cap and plain (baseline) JPEG when asked, as receipts do", async () => {
    const receipt = await normalizePhoto(await png(1000, 3000), {
      maxDimension: 2560,
      mozjpeg: false,
    });

    const metadata = await sharp(receipt.body).metadata();
    expect([metadata.width, metadata.height]).toEqual([853, 2560]);
    expect(metadata.isProgressive).toBe(false);
  });

  it("never enlarges a smaller image", async () => {
    const photo = await normalizePhoto(await png(320, 240), { maxDimension: 2560 });

    const metadata = await sharp(photo.body).metadata();
    expect([metadata.width, metadata.height]).toEqual([320, 240]);
  });
});
