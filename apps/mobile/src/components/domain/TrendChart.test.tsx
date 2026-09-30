import { fireEvent, render, screen } from "@testing-library/react-native";

import { Text } from "../ui/Text";

import { TrendChart, type TrendPoint, type TrendSeries } from "./TrendChart";

const SERIES: TrendSeries[] = [
  { name: "Receitas", color: "#0C7F3F", fill: true },
  { name: "Despesas pagas", color: "#5550F0" },
];

const POINTS: TrendPoint[] = [
  { key: "2026-07", label: "jul", values: [5000, 3600], spoken: "julho de 2026: receitas" },
  { key: "2026-08", label: "ago", values: [5200, 3767], spoken: "agosto de 2026: receitas" },
  { key: "2026-09", label: "set", values: [0, 0], spoken: "setembro de 2026: receitas" },
];

const detail = (point: TrendPoint) => <Text>{`Detalhe de ${point.key}`}</Text>;
const selected = (label: RegExp) =>
  screen.getByLabelText(label).props.accessibilityState.selected as boolean;

describe("TrendChart", () => {
  it("starts on the current (last) month, even an empty one", async () => {
    await render(<TrendChart points={POINTS} series={SERIES} renderDetail={detail} />);

    expect(screen.getByText("Detalhe de 2026-09")).toBeTruthy();
    expect(selected(/^setembro de 2026/)).toBe(true);
    expect(selected(/^julho de 2026/)).toBe(false);
  });

  it("reads the month the user taps", async () => {
    await render(<TrendChart points={POINTS} series={SERIES} renderDetail={detail} />);

    await fireEvent.press(screen.getByLabelText(/^julho de 2026/));

    expect(screen.getByText("Detalhe de 2026-07")).toBeTruthy();
    expect(screen.queryByText("Detalhe de 2026-09")).toBeNull();
    expect(selected(/^julho de 2026/)).toBe(true);
    expect(selected(/^setembro de 2026/)).toBe(false);
  });

  it("has one button per month; labels and legend are seen, not read", async () => {
    await render(<TrendChart points={POINTS} series={SERIES} renderDetail={detail} />);

    for (const label of [/^julho de 2026/, /^agosto de 2026/, /^setembro de 2026/]) {
      expect(screen.getByLabelText(label).props.accessibilityRole).toBe("button");
    }
    for (const text of ["jul", "ago", "set", "Receitas", "Despesas pagas"]) {
      expect(screen.getByText(text, { includeHiddenElements: true })).toBeTruthy();
      expect(screen.queryByText(text)).toBeNull();
    }
  });
});
