import { detectImageType } from "./image-type";

describe("detectImageType", () => {
  it("recognizes JPEG, PNG and WebP by their magic bytes", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))?.extension).toBe("jpg");
    expect(
      detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))
        ?.contentType,
    ).toBe("image/png");
    const webp = Buffer.concat([
      Buffer.from("RIFF"),
      Buffer.from([0x24, 0x00, 0x00, 0x00]),
      Buffer.from("WEBPVP8 "),
    ]);
    expect(detectImageType(webp)?.extension).toBe("webp");
  });

  it("rejects anything else, whatever it claims to be", () => {
    expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImageType(Buffer.from("GIF89a"))).toBeNull();
    expect(detectImageType(Buffer.from("%PDF-1.7"))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
    // RIFF but not WebP (e.g. a WAV file).
    expect(detectImageType(Buffer.from("RIFF\x00\x00\x00\x00WAVEfmt "))).toBeNull();
  });
});
