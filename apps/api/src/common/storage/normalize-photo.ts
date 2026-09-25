import sharp from "sharp";

// Longest side kept for stored photos — matches what the mobile app
// uploads; bigger (e.g. straight-from-API) uploads are scaled down.
export const MAX_PHOTO_DIMENSION = 1600;
// Decompression-bomb guard: a small, highly compressed file can claim
// enormous dimensions. 60 MP is above any phone camera.
const MAX_INPUT_PIXELS = 60_000_000;

export interface NormalizedPhoto {
  body: Buffer;
  contentType: "image/jpeg";
  extension: "jpg";
}

// Decodes and re-encodes an uploaded photo as a fresh JPEG:
// - drops ALL metadata (EXIF/GPS/XMP — sharp keeps none unless asked),
//   after applying the EXIF orientation so the image still looks upright;
// - neutralizes polyglots: only decoded pixels survive, never the
//   uploader's original bytes;
// - caps size at MAX_PHOTO_DIMENSION, flattening any transparency onto
//   white (JPEG has no alpha).
// Throws if the bytes don't decode as an image.
export async function normalizePhoto(input: Buffer): Promise<NormalizedPhoto> {
  const body = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
    .rotate()
    .resize({
      width: MAX_PHOTO_DIMENSION,
      height: MAX_PHOTO_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
  return { body, contentType: "image/jpeg", extension: "jpg" };
}
