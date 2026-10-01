import {
  adminNewsState,
  excerpt,
  moreUnreadNote,
  readersLabel,
  unreadCountLabel,
} from "./changelog-display";

describe("changelog display", () => {
  it("says how many are waiting, legacy's way", () => {
    expect(unreadCountLabel(1)).toBeNull();
    expect(unreadCountLabel(3)).toBe("3 novas");
    expect(moreUnreadNote(1)).toBeNull();
    expect(moreUnreadNote(2)).toBe("Há mais 1 novidade não lida. Ela aparece na próxima vez.");
    expect(moreUnreadNote(4)).toMatch(/^Há mais 3 novidades não lidas\. Elas aparecem/);
  });

  it("previews the text on one flat line, cut at a word", () => {
    expect(excerpt("Curto.")).toBe("Curto.");
    expect(excerpt("Linha um.\n\nLinha dois.")).toBe("Linha um. Linha dois.");
    const long = `${"palavra ".repeat(30)}fim`;
    const cut = excerpt(long, 40);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(41);
    expect(cut).not.toMatch(/palavr…$/);
  });

  it("tells an admin what users see of an entry now", () => {
    expect(adminNewsState({ status: "ACTIVE", expiresAt: null }, "2026-09-30").label).toBe("Ativa");
    expect(adminNewsState({ status: "ACTIVE", expiresAt: "2026-09-30" }, "2026-09-30").state).toBe(
      "active",
    );
    expect(adminNewsState({ status: "ACTIVE", expiresAt: "2026-09-29" }, "2026-09-30").label).toBe(
      "Vencida",
    );
    expect(adminNewsState({ status: "INACTIVE", expiresAt: null }, "2026-09-30").label).toBe(
      "Inativa",
    );
    expect(readersLabel(0)).toBe("Ninguém leu ainda");
    expect(readersLabel(1)).toBe("1 leitura");
    expect(readersLabel(7)).toBe("7 leituras");
  });
});
