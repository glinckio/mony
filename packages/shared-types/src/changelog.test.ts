import { changelogInputSchema, youtubeVideoId, youtubeWatchUrl } from "./changelog";

describe("youtubeVideoId", () => {
  it("reads the id from every YouTube link shape", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "  https://youtu.be/dQw4w9WgXcQ  ",
    ]) {
      expect(youtubeVideoId(url)).toBe("dQw4w9WgXcQ");
    }
  });

  it("refuses anything else", () => {
    for (const url of [
      "",
      "not a url",
      "https://vimeo.com/123456",
      "https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/watch?v=short",
      "javascript:alert(1)",
      "https://www.youtube.com/channel/UC123",
    ]) {
      expect(youtubeVideoId(url)).toBeNull();
    }
  });

  it("builds the link back from the id", () => {
    expect(youtubeWatchUrl("dQw4w9WgXcQ")).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    // Never a link from anything but an id.
    expect(youtubeWatchUrl("dQw4w9WgXcQ&list=x")).toBeNull();
    expect(youtubeWatchUrl("")).toBeNull();
  });
});

describe("changelogInputSchema", () => {
  const valid = {
    title: "Relatórios chegaram",
    description: "Agora dá para ver o resumo do período.",
    videoUrl: "",
    expiresAt: "",
    status: "ACTIVE" as const,
  };

  it("accepts a plain entry and optional video and expiry", () => {
    expect(changelogInputSchema.safeParse(valid).success).toBe(true);
    expect(
      changelogInputSchema.safeParse({
        ...valid,
        videoUrl: "https://youtu.be/dQw4w9WgXcQ",
        expiresAt: "2026-12-31",
      }).success,
    ).toBe(true);
  });

  it("explains what's wrong in pt-BR", () => {
    const messages = (input: object) =>
      changelogInputSchema.safeParse({ ...valid, ...input }).error?.issues.map((i) => i.message);
    expect(messages({ title: "   " })).toEqual(["Informe o título."]);
    expect(messages({ description: "" })).toEqual(["Escreva o texto da novidade."]);
    expect(messages({ videoUrl: "https://vimeo.com/1" })).toEqual(["Use um link do YouTube."]);
    expect(messages({ expiresAt: "2026-02-30" })).toEqual(["Data inválida."]);
    expect(messages({ title: "x".repeat(151) })).toEqual(["Use até 150 caracteres."]);
  });
});
