import { fireEvent, render, screen } from "@testing-library/react-native";

import { Text } from "../ui/Text";

import { ColumnChart, type ChartColumn, type ChartSeries } from "./ColumnChart";

const INCOME: ChartSeries = {
  name: "Receitas",
  gradient: ["#0C7F3F", "#0A6B35"],
  color: "#0C7F3F",
};
const EXPENSES: ChartSeries = {
  name: "Despesas pagas",
  gradient: ["#5550F0", "#3F3AD0"],
  color: "#5550F0",
};

const MONTHS: ChartColumn[] = [
  {
    key: "2026-07",
    label: "jul/2026",
    values: [5000, 3600],
    caption: <Text>R$ 1.400,00</Text>,
    spoken: "julho de 2026: receitas 5000 reais, despesas 3600 reais",
  },
  {
    key: "2026-08",
    label: "ago/2026",
    values: [5200, 3767.04],
    caption: <Text>R$ 1.432,96</Text>,
    spoken: "agosto de 2026: receitas 5200 reais, despesas 3767 reais e 4 centavos",
  },
  {
    key: "2026-09",
    label: "set/2026",
    values: [5200, 3719.31],
    caption: <Text>R$ 1.480,69</Text>,
    spoken: "setembro de 2026: receitas 5200 reais, despesas 3719 reais e 31 centavos",
  },
];

const detail = (column: ChartColumn) => <Text>{`Detalhe de ${column.label}`}</Text>;
const selected = (label: RegExp) =>
  screen.getByLabelText(label).props.accessibilityState.selected as boolean;

describe("ColumnChart", () => {
  it("starts on the last column and shows its figures above the bars", async () => {
    await render(
      <ColumnChart columns={MONTHS} series={[INCOME, EXPENSES]} renderDetail={detail} />,
    );

    expect(screen.getByText("Detalhe de set/2026")).toBeTruthy();
    expect(selected(/^setembro de 2026/)).toBe(true);
    expect(selected(/^julho de 2026/)).toBe(false);
    // Every column shows its label and its caption (the month's balance).
    for (const text of ["jul/2026", "ago/2026", "set/2026", "R$ 1.400,00", "R$ 1.480,69"]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it("selects the column the user taps", async () => {
    await render(
      <ColumnChart columns={MONTHS} series={[INCOME, EXPENSES]} renderDetail={detail} />,
    );

    await fireEvent.press(screen.getByLabelText(/^julho de 2026/));

    expect(screen.getByText("Detalhe de jul/2026")).toBeTruthy();
    expect(screen.queryByText("Detalhe de set/2026")).toBeNull();
    expect(selected(/^julho de 2026/)).toBe(true);
    expect(selected(/^setembro de 2026/)).toBe(false);
  });

  it("can start on a given column (the busiest weekday)", async () => {
    await render(
      <ColumnChart
        columns={MONTHS}
        series={[INCOME, EXPENSES]}
        initialKey="2026-08"
        renderDetail={detail}
      />,
    );

    expect(screen.getByText("Detalhe de ago/2026")).toBeTruthy();
    expect(selected(/^agosto de 2026/)).toBe(true);
  });

  it("reads each column as one button with its spoken figures", async () => {
    await render(
      <ColumnChart columns={MONTHS} series={[INCOME, EXPENSES]} renderDetail={detail} />,
    );

    const column = screen.getByLabelText(
      "agosto de 2026: receitas 5200 reais, despesas 3767 reais e 4 centavos",
    );
    expect(column.props.accessibilityRole).toBe("button");
  });

  it("names the series in a legend only when there are two", async () => {
    const view = await render(
      <ColumnChart columns={MONTHS} series={[INCOME, EXPENSES]} renderDetail={detail} />,
    );
    // Seen, but not read aloud: each column already says both figures.
    expect(screen.getByText("Receitas", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText("Despesas pagas", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText("Receitas")).toBeNull();

    await view.rerender(
      <ColumnChart
        columns={MONTHS.map((column) => ({ ...column, values: [column.values[1]!] }))}
        series={[EXPENSES]}
        renderDetail={detail}
      />,
    );
    expect(screen.queryByText("Despesas pagas", { includeHiddenElements: true })).toBeNull();
  });
});
