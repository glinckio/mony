import type { ReportCategory } from "@mony/shared-types";
import { render, screen, within } from "@testing-library/react-native";

import { CategoryDonut } from "./CategoryDonut";

const category = (id: string, name: string, total: string): ReportCategory => ({
  categoryId: id,
  name,
  color: "#5550F0",
  icon: "pricetag",
  total,
});

// Legacy's top 5, largest first: 2.000,00 in all.
const TOP_FIVE = [
  category("c1", "Aluguel", "1000.00"),
  category("c2", "Mercado", "500.00"),
  category("c3", "Luz", "250.00"),
  category("c4", "Internet", "150.00"),
  category("c5", "Farmácia", "100.00"),
];

describe("CategoryDonut", () => {
  it("lists each category with its value and its share of the top 5", async () => {
    await render(<CategoryDonut testID="donut" categories={TOP_FIVE} centerLabel="5 maiores" />);

    const rows: Array<[string, string, string]> = [
      ["Aluguel", "R$ 1.000,00", "50,0%"],
      ["Mercado", "R$ 500,00", "25,0%"],
      ["Luz", "R$ 250,00", "12,5%"],
      ["Internet", "R$ 150,00", "7,5%"],
      ["Farmácia", "R$ 100,00", "5,0%"],
    ];
    for (const [name, value, share] of rows) {
      const row = within(screen.getByLabelText(new RegExp(`^${name}:`)));
      expect(row.getByText(name)).toBeTruthy();
      expect(row.getByText(value)).toBeTruthy();
      expect(row.getByText(share)).toBeTruthy();
    }
    // The middle: the label and the top 5's total.
    expect(screen.getByText("5 maiores")).toBeTruthy();
    expect(screen.getByText("R$ 2.000,00")).toBeTruthy();
  });

  it("reads the total and every legend row aloud, as a list", async () => {
    await render(<CategoryDonut categories={TOP_FIVE} centerLabel="5 maiores" />);

    expect(screen.getByLabelText("5 maiores: 2000 reais")).toBeTruthy();
    expect(screen.getByLabelText("Aluguel: 1000 reais, 50,0%")).toBeTruthy();
    expect(screen.getByLabelText("Farmácia: 100 reais, 5,0%")).toBeTruthy();
  });

  it("gives a single category the whole donut", async () => {
    await render(
      <CategoryDonut categories={[category("c9", "Salário", "5200.00")]} centerLabel="Total" />,
    );

    expect(screen.getByLabelText("Salário: 5200 reais, 100,0%")).toBeTruthy();
    expect(screen.getByLabelText("Total: 5200 reais")).toBeTruthy();
  });
});
