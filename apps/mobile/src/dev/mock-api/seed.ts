import type {
  Category,
  DebtInstallment,
  DebtStatus,
  DebtWithInstallments,
  FuelType,
  Goal,
  GroceryCategory,
  GroceryItem,
  Profile,
  Transaction,
  Vehicle,
  WorkspaceType,
} from "@mony/shared-types";

// Deterministic, realistic pt-BR seed for the in-memory mock backend.
// Dates are relative to the real "today" so the dashboard's current month
// always has data; everything else is fixed (no randomness), so prints in
// design/revisao/ stay stable. No real person's data.

const STAMP = "2026-01-02T12:00:00.000Z";

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayOfMonth(monthOffset: number, day: number, today = new Date()): string {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + monthOffset, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return isoDate(date);
}

function daysAgo(days: number, today = new Date()): string {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days);
  return isoDate(date);
}

export const seedProfile: Profile = {
  id: "user-1",
  name: "Marina Costa",
  email: "marina.costa@example.com",
  phone: "11900000000",
  phone2: null,
  activeWorkspace: "PERSONAL",
  createdAt: STAMP,
  lastAccessAt: STAMP,
};

function category(
  id: string,
  name: string,
  type: Category["type"],
  color: string,
  icon: Category["icon"],
): Category {
  return { id, name, type, color, icon, createdAt: STAMP };
}

export const seedCategories: Category[] = [
  category("cat-mercado", "Mercado", "EXPENSE", "#10B981", "storefront-outline"),
  category("cat-casa", "Casa", "EXPENSE", "#3B82F6", "home-outline"),
  category("cat-transporte", "Transporte", "EXPENSE", "#F59E0B", "bus-outline"),
  category("cat-carro", "Carro", "EXPENSE", "#8B5CF6", "car-outline"),
  category("cat-saude", "Saúde", "EXPENSE", "#EF4444", "medkit-outline"),
  category("cat-lazer", "Lazer", "EXPENSE", "#EC4899", "game-controller-outline"),
  category(
    "cat-delivery",
    "Restaurantes, bares e delivery",
    "EXPENSE",
    "#F97316",
    "restaurant-outline",
  ),
  category("cat-salario", "Salário", "INCOME", "#14B8A6", "cash-outline"),
  category("cat-freela", "Freelas", "INCOME", "#3B82F6", "laptop-outline"),
  category("cat-rendimentos", "Rendimentos", "INCOME", "#10B981", "trending-up-outline"),
];

interface TxSeed {
  categoryId: string;
  type: Transaction["type"];
  status: Transaction["status"];
  description: string;
  amount: string;
  date: string;
  workspace?: WorkspaceType;
  recurring?: boolean;
}

function buildTransactions(): Transaction[] {
  const rows: TxSeed[] = [
    // This month.
    {
      categoryId: "cat-salario",
      type: "INCOME",
      status: "PAID",
      description: "Salário",
      amount: "5200.00",
      date: dayOfMonth(0, 5),
      recurring: true,
    },
    {
      categoryId: "cat-freela",
      type: "INCOME",
      status: "PAID",
      description: "Freela — identidade visual da padaria",
      amount: "1350.00",
      date: daysAgo(3),
    },
    {
      categoryId: "cat-rendimentos",
      type: "INCOME",
      status: "PAID",
      description: "Rendimento da poupança",
      amount: "38.72",
      date: dayOfMonth(0, 1),
    },
    {
      categoryId: "cat-mercado",
      type: "EXPENSE",
      status: "PENDING",
      description: "Mercado Pão de Açúcar",
      amount: "212.40",
      date: daysAgo(0),
    },
    {
      categoryId: "cat-transporte",
      type: "EXPENSE",
      status: "PAID",
      description: "Uber para o trabalho",
      amount: "27.90",
      date: daysAgo(0),
    },
    {
      categoryId: "cat-delivery",
      type: "EXPENSE",
      status: "PAID",
      description: "iFood — jantar de sexta com a família toda reunida em casa",
      amount: "118.50",
      date: daysAgo(1),
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PENDING",
      description: "Conta de luz — Enel",
      amount: "186.33",
      date: daysAgo(1),
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Aluguel",
      amount: "1850.00",
      date: dayOfMonth(0, 5),
      recurring: true,
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Internet fibra",
      amount: "99.90",
      date: dayOfMonth(0, 7),
      recurring: true,
    },
    {
      categoryId: "cat-saude",
      type: "EXPENSE",
      status: "PAID",
      description: "Farmácia",
      amount: "64.15",
      date: daysAgo(2),
    },
    {
      categoryId: "cat-carro",
      type: "EXPENSE",
      status: "PAID",
      description: "Gasolina",
      amount: "250.00",
      date: daysAgo(4),
    },
    {
      categoryId: "cat-lazer",
      type: "EXPENSE",
      status: "PENDING",
      description: "Ingressos do show",
      amount: "280.00",
      date: daysAgo(4),
    },
    {
      categoryId: "cat-mercado",
      type: "EXPENSE",
      status: "PAID",
      description: "Feira de domingo",
      amount: "73.60",
      date: daysAgo(5),
    },
    {
      categoryId: "cat-saude",
      type: "EXPENSE",
      status: "PENDING",
      description: "Plano de saúde",
      amount: "412.80",
      date: dayOfMonth(0, 10),
      recurring: true,
    },
    {
      categoryId: "cat-transporte",
      type: "EXPENSE",
      status: "PAID",
      description: "Bilhete Único",
      amount: "100.00",
      date: daysAgo(6),
    },
    {
      categoryId: "cat-mercado",
      type: "EXPENSE",
      status: "PAID",
      description: "Atacadão — compra do mês",
      amount: "684.27",
      date: daysAgo(7),
    },
    {
      categoryId: "cat-lazer",
      type: "EXPENSE",
      status: "PAID",
      description: "Streaming",
      amount: "0.99",
      date: daysAgo(8),
    },
    // Last month.
    {
      categoryId: "cat-salario",
      type: "INCOME",
      status: "PAID",
      description: "Salário",
      amount: "5200.00",
      date: dayOfMonth(-1, 5),
      recurring: true,
    },
    {
      categoryId: "cat-freela",
      type: "INCOME",
      status: "PAID",
      description: "Freela — site do salão",
      amount: "600.00",
      date: dayOfMonth(-1, 18),
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Aluguel",
      amount: "1850.00",
      date: dayOfMonth(-1, 5),
      recurring: true,
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Internet fibra",
      amount: "99.90",
      date: dayOfMonth(-1, 7),
      recurring: true,
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Conta de luz — Enel",
      amount: "201.12",
      date: dayOfMonth(-1, 12),
    },
    {
      categoryId: "cat-mercado",
      type: "EXPENSE",
      status: "PAID",
      description: "Atacadão — compra do mês",
      amount: "712.90",
      date: dayOfMonth(-1, 3),
    },
    {
      categoryId: "cat-mercado",
      type: "EXPENSE",
      status: "PAID",
      description: "Mercado Pão de Açúcar",
      amount: "158.35",
      date: dayOfMonth(-1, 16),
    },
    {
      categoryId: "cat-carro",
      type: "EXPENSE",
      status: "PAID",
      description: "Gasolina",
      amount: "230.00",
      date: dayOfMonth(-1, 9),
    },
    {
      categoryId: "cat-carro",
      type: "EXPENSE",
      status: "PAID",
      description: "Troca de óleo",
      amount: "189.00",
      date: dayOfMonth(-1, 21),
    },
    {
      categoryId: "cat-saude",
      type: "EXPENSE",
      status: "PAID",
      description: "Plano de saúde",
      amount: "412.80",
      date: dayOfMonth(-1, 10),
      recurring: true,
    },
    {
      categoryId: "cat-delivery",
      type: "EXPENSE",
      status: "PAID",
      description: "Pizzaria do bairro",
      amount: "89.00",
      date: dayOfMonth(-1, 14),
    },
    {
      categoryId: "cat-lazer",
      type: "EXPENSE",
      status: "PAID",
      description: "Cinema",
      amount: "64.00",
      date: dayOfMonth(-1, 20),
    },
    {
      categoryId: "cat-transporte",
      type: "EXPENSE",
      status: "PAID",
      description: "Bilhete Único",
      amount: "100.00",
      date: dayOfMonth(-1, 2),
    },
    {
      categoryId: "cat-saude",
      type: "EXPENSE",
      status: "PAID",
      description: "Dentista",
      amount: "350.00",
      date: dayOfMonth(-1, 24),
    },
    // Two months ago.
    {
      categoryId: "cat-salario",
      type: "INCOME",
      status: "PAID",
      description: "Salário",
      amount: "5200.00",
      date: dayOfMonth(-2, 5),
      recurring: true,
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Aluguel",
      amount: "1850.00",
      date: dayOfMonth(-2, 5),
      recurring: true,
    },
    {
      categoryId: "cat-mercado",
      type: "EXPENSE",
      status: "PAID",
      description: "Atacadão — compra do mês",
      amount: "655.10",
      date: dayOfMonth(-2, 4),
    },
    {
      categoryId: "cat-carro",
      type: "EXPENSE",
      status: "PAID",
      description: "IPVA — 3ª parcela",
      amount: "412.66",
      date: dayOfMonth(-2, 15),
    },
    {
      categoryId: "cat-saude",
      type: "EXPENSE",
      status: "PAID",
      description: "Plano de saúde",
      amount: "412.80",
      date: dayOfMonth(-2, 10),
      recurring: true,
    },
    {
      categoryId: "cat-lazer",
      type: "EXPENSE",
      status: "PAID",
      description: "Aniversário da Júlia",
      amount: "240.00",
      date: dayOfMonth(-2, 22),
    },
    // Business notebook.
    {
      categoryId: "cat-freela",
      type: "INCOME",
      status: "PAID",
      description: "Nota fiscal 0142 — Café Aroma",
      amount: "3800.00",
      date: daysAgo(2),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-freela",
      type: "INCOME",
      status: "PENDING",
      description: "Nota fiscal 0143 — Ateliê Linha",
      amount: "2200.00",
      date: daysAgo(1),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Coworking",
      amount: "690.00",
      date: dayOfMonth(0, 3),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PENDING",
      description: "DAS do MEI",
      amount: "75.90",
      date: dayOfMonth(0, 20),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-lazer",
      type: "EXPENSE",
      status: "PAID",
      description: "Licença do software de design",
      amount: "329.00",
      date: daysAgo(6),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-freela",
      type: "INCOME",
      status: "PAID",
      description: "Nota fiscal 0139 — Loja Brisa",
      amount: "1500.00",
      date: dayOfMonth(-1, 12),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "Coworking",
      amount: "690.00",
      date: dayOfMonth(-1, 3),
      workspace: "BUSINESS",
    },
    {
      categoryId: "cat-casa",
      type: "EXPENSE",
      status: "PAID",
      description: "DAS do MEI",
      amount: "75.90",
      date: dayOfMonth(-1, 20),
      workspace: "BUSINESS",
    },
  ];

  return rows.map((row, index) => ({
    id: `tx-${String(index + 1).padStart(3, "0")}`,
    categoryId: row.categoryId,
    workspace: row.workspace ?? "PERSONAL",
    type: row.type,
    // Income is always PAID server-side.
    status: row.type === "INCOME" ? "PAID" : row.status,
    description: row.description,
    amount: row.amount,
    date: row.date,
    recurring: row.recurring ?? false,
    createdAt: STAMP,
    updatedAt: STAMP,
  }));
}

export const seedTransactions = buildTransactions();

function goal(
  id: string,
  title: string,
  targetAmount: number,
  currentAmount: number,
  targetDate: string | null,
  options: Partial<Pick<Goal, "completed" | "description" | "categoryId" | "workspace">> = {},
): Goal {
  return {
    id,
    workspace: options.workspace ?? "PERSONAL",
    categoryId: options.categoryId ?? null,
    title,
    description: options.description ?? null,
    targetAmount: targetAmount.toFixed(2),
    currentAmount: currentAmount.toFixed(2),
    targetDate,
    completed: options.completed ?? false,
    progressPercent: Math.min(100, Math.max(0, (currentAmount / targetAmount) * 100)),
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

export const seedGoals: Goal[] = [
  goal("goal-viagem", "Viagem para Salvador em família", 5000, 3000, daysAgo(12), {
    description: "Passagens e hospedagem para quatro pessoas em julho.",
    categoryId: "cat-lazer",
  }),
  goal("goal-reserva", "Reserva de emergência", 10000, 800, dayOfMonth(10, 1)),
  goal("goal-curso", "Curso de inglês", 1800, 0, null),
  goal("goal-notebook", "Notebook novo", 4200, 4200, null, { completed: true }),
  goal("goal-caixa", "Capital de giro", 8000, 2600, dayOfMonth(4, 1), { workspace: "BUSINESS" }),
];

function installments(
  debtId: string,
  total: number,
  count: number,
  startDate: string,
  paid: number,
): DebtInstallment[] {
  const baseCents = Math.floor(Math.round(total * 100) / count);
  const lastCents = Math.round(total * 100) - baseCents * (count - 1);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const due = new Date(start);
    due.setUTCMonth(start.getUTCMonth() + index);
    const isPaid = index < paid;
    return {
      id: `${debtId}-i${index + 1}`,
      installmentNo: index + 1,
      amount: ((index === count - 1 ? lastCents : baseCents) / 100).toFixed(2),
      dueDate: isoDate(due),
      status: isPaid ? "PAID" : "PENDING",
      paymentDate: isPaid ? isoDate(due) : null,
      transactionId: null,
    };
  });
}

export function debtStatusOf(list: DebtInstallment[], today = isoDate(new Date())): DebtStatus {
  if (list.every((item) => item.status === "PAID")) return "PAID_OFF";
  if (list.some((item) => item.status === "PENDING" && item.dueDate < today)) return "OVERDUE";
  return "ACTIVE";
}

export function withTotals(
  debt: Omit<
    DebtWithInstallments,
    "paidAmount" | "remainingAmount" | "paidInstallments" | "status"
  >,
): DebtWithInstallments {
  const paidList = debt.installments.filter((item) => item.status === "PAID");
  const paidCents = paidList.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0);
  const totalCents = Math.round(Number(debt.totalAmount) * 100);
  return {
    ...debt,
    paidAmount: (paidCents / 100).toFixed(2),
    remainingAmount: ((totalCents - paidCents) / 100).toFixed(2),
    paidInstallments: paidList.length,
    status: debtStatusOf(debt.installments),
  };
}

function debt(
  id: string,
  name: string,
  total: number,
  count: number,
  startDate: string,
  paid: number,
  options: Partial<
    Pick<DebtWithInstallments, "interestRate" | "notes" | "endDate" | "workspace" | "categoryId">
  > = {},
): DebtWithInstallments {
  return withTotals({
    id,
    workspace: options.workspace ?? "PERSONAL",
    categoryId: options.categoryId ?? null,
    name,
    totalAmount: total.toFixed(2),
    startDate,
    endDate: options.endDate ?? null,
    interestRate: options.interestRate ?? null,
    notes: options.notes ?? null,
    totalInstallments: count,
    createdAt: STAMP,
    updatedAt: STAMP,
    installments: installments(id, total, count, startDate, paid),
  });
}

export const seedDebts: DebtWithInstallments[] = [
  debt("debt-carro", "Financiamento do carro", 36000, 12, dayOfMonth(-7, 10), 7, {
    interestRate: "1.20",
    notes: "Banco do bairro, contrato 88213. Débito automático desligado.",
    categoryId: "cat-carro",
  }),
  debt("debt-geladeira", "Geladeira parcelada no cartão", 3290, 10, dayOfMonth(-4, 15), 2, {
    categoryId: "cat-casa",
  }),
  debt("debt-tia", "Empréstimo da tia Rosa", 1500, 5, dayOfMonth(-6, 1), 5),
  debt("debt-maquina", "Máquina de cartão", 1188, 12, dayOfMonth(-2, 8), 2, {
    workspace: "BUSINESS",
  }),
];

function groceryItem(
  id: string,
  name: string,
  category: GroceryCategory,
  unit: string,
  current: number,
  ideal: number,
  price: number,
): GroceryItem {
  return {
    id,
    name,
    unit,
    idealQuantity: ideal.toFixed(2),
    currentQuantity: current.toFixed(2),
    estimatedPrice: price.toFixed(2),
    category,
    missing: current < ideal,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

export const seedGroceryItems: GroceryItem[] = [
  groceryItem("gi-arroz", "Arroz", "FOOD", "kg", 2, 5, 5.49),
  groceryItem("gi-feijao", "Feijão carioca", "FOOD", "kg", 1, 2, 8.9),
  groceryItem("gi-macarrao", "Macarrão", "FOOD", "pacote", 3, 3, 4.29),
  groceryItem("gi-cafe", "Café em pó", "BEVERAGES", "pacote", 0, 2, 18.9),
  groceryItem("gi-suco", "Suco de uva integral", "BEVERAGES", "garrafa", 1, 2, 16.5),
  groceryItem("gi-frango", "Peito de frango", "MEAT", "kg", 0.5, 2, 21.9),
  groceryItem("gi-carne", "Carne moída", "MEAT", "kg", 1, 1, 34.9),
  groceryItem("gi-pao-queijo", "Pão de queijo congelado", "FROZEN", "pacote", 0, 1, 19.9),
  groceryItem("gi-leite", "Leite integral", "DAIRY_AND_DELI", "litro", 4, 12, 5.19),
  groceryItem("gi-queijo", "Queijo minas frescal", "DAIRY_AND_DELI", "peça", 1, 1, 22.0),
  groceryItem("gi-sabonete", "Sabonete", "PERSONAL_CARE", "un", 2, 4, 2.79),
  groceryItem("gi-pasta", "Pasta de dente", "PERSONAL_CARE", "un", 1, 2, 6.49),
  groceryItem("gi-banana", "Banana prata", "PRODUCE", "dúzia", 1, 1, 7.99),
  groceryItem("gi-tomate", "Tomate", "PRODUCE", "kg", 0, 1.5, 7.49),
  groceryItem("gi-detergente", "Detergente", "CLEANING", "un", 0, 4, 2.49),
  groceryItem(
    "gi-sabao",
    "Sabão líquido para roupas de cor e brancas",
    "CLEANING",
    "litro",
    1,
    3,
    29.9,
  ),
  groceryItem("gi-oleo", "Óleo de soja", "PANTRY", "garrafa", 1, 2, 7.89),
  groceryItem("gi-acucar", "Açúcar", "PANTRY", "kg", 2, 2, 4.59),
  groceryItem("gi-pao", "Pão francês", "BAKERY", "kg", 0, 1, 14.9),
  groceryItem("gi-racao", "Ração do Thor", "PETS", "kg", 3, 10, 12.5),
  groceryItem("gi-papel", "Papel-toalha", "HOUSEHOLD", "rolo", 2, 4, 4.99),
];

export const seedGroceryBudget = { amount: "800.00", setAt: STAMP };

function vehicle(
  id: string,
  make: string,
  model: string,
  manufactureYear: number,
  modelYear: number,
  currentMileage: number,
  extra: {
    licensePlate?: string;
    color?: string;
    fuelType?: FuelType;
    acquisitionDate?: string;
  } = {},
): Vehicle {
  return {
    id,
    make,
    model,
    displayName: `${make} ${model} ${modelYear}`,
    manufactureYear,
    modelYear,
    currentMileage,
    licensePlate: extra.licensePlate ?? null,
    acquisitionDate: extra.acquisitionDate ?? null,
    color: extra.color ?? null,
    fuelType: extra.fuelType ?? null,
    photoUrl: null,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

export const seedVehicles: Vehicle[] = [
  vehicle("veh-renegade", "Jeep", "Renegade", 2021, 2022, 36200, {
    licensePlate: "ABC1D23",
    color: "Prata",
    fuelType: "FLEX",
    acquisitionDate: "2023-05-12",
  }),
  vehicle("veh-cg", "Honda", "CG 160 Fan", 2019, 2019, 18450, {
    fuelType: "GASOLINE",
    color: "Vermelha",
  }),
  vehicle("veh-saveiro", "Volkswagen", "Saveiro Cross Cabine Dupla", 2020, 2020, 98710, {
    licensePlate: "RIO2A18",
    fuelType: "FLEX",
  }),
];

// Pre-January history for the yearly chart (months with no seeded
// transactions), in reais: [income, expensesPaid].
export const yearlyHistory: Record<number, [number, number]> = {
  1: [5200, 4610.4],
  2: [5200, 3980.15],
  3: [5890, 4402.3],
  4: [5200, 5310.8],
  5: [6450, 4120],
  6: [5200, 3875.55],
  7: [5520, 6230.9],
  8: [5200, 4015.1],
  9: [5200, 4388.72],
  10: [5980, 4150],
  11: [5200, 3920.4],
  12: [7800, 6012.2],
};
