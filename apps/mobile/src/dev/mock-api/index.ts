import type {
  AuthTokens,
  Category,
  DashboardData,
  Report,
  DebtInstallment,
  DebtWithInstallments,
  Goal,
  GroceryItem,
  MaintenanceAlertStatus,
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
  Plan,
  Profile,
  Subscription,
  Transaction,
  Vehicle,
  WorkspaceType,
} from "@mony/shared-types";
import { REPORT_TOP_CATEGORIES } from "@mony/shared-types";

import { ApiError } from "../../lib/api-client";
import { useDesignLab } from "../design-lab";

import {
  isoDate,
  seedCategories,
  seedDebts,
  seedGoals,
  seedGroceryBudget,
  seedGroceryItems,
  seedMaintenanceRecords,
  seedMaintenanceTypes,
  seedProfile,
  seedTransactions,
  seedVehicles,
  withTotals,
  yearlyHistory,
} from "./seed";

// In-memory mock of the Mony API (dev only, see src/dev/flags.ts). It
// mirrors the real endpoints closely enough for every screen to work —
// create/edit/delete really change this store — and it obeys the
// DesignLab data state: GETs return empty data, hang ("loading") or fail
// ("error"); mutations always behave normally.

const LATENCY_MS = 180;
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const db = {
  profile: clone(seedProfile),
  categories: clone(seedCategories),
  transactions: clone(seedTransactions),
  goals: clone(seedGoals),
  debts: clone(seedDebts),
  groceryItems: clone(seedGroceryItems),
  groceryBudget: clone(seedGroceryBudget) as { amount: string | null; setAt: string | null },
  vehicles: clone(seedVehicles),
  maintenanceTypes: clone(seedMaintenanceTypes),
  maintenanceRecords: clone(seedMaintenanceRecords),
  // vehicleId -> typeId -> mileage the next service is due at.
  maintenanceAlerts: {} as Record<string, Record<string, number>>,
  subscription: null as Subscription | null,
  nextId: 1000,
};

const newId = (prefix: string) => `${prefix}-${db.nextId++}`;
const now = () => new Date().toISOString();
const money = (value: number) => value.toFixed(2);
const toCents = (value: string | number) => Math.round(Number(value) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);
const workspace = (): WorkspaceType => db.profile.activeWorkspace;

export const MOCK_TOKENS: AuthTokens = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  user: {
    id: seedProfile.id,
    name: seedProfile.name,
    email: seedProfile.email,
    activeWorkspace: seedProfile.activeWorkspace,
  },
};

function fail(statusCode: number, message: string, path: string): never {
  throw new ApiError(statusCode, {
    statusCode,
    error: statusCode === 404 ? "Not Found" : statusCode === 400 ? "Bad Request" : "Error",
    message: [message],
    path,
    timestamp: now(),
  });
}

type Json = Record<string, unknown>;
type Handler = (ctx: {
  params: string[];
  query: URLSearchParams;
  body: Json;
  path: string;
}) => unknown;
interface Route {
  method: string;
  pattern: RegExp;
  handler: Handler;
  // GETs that return a collection answer with this in the "empty" state.
  empty?: () => unknown;
}

// ---------------------------------------------------------------- dashboard

function periodRange(period: string, query: URLSearchParams): [string, string] {
  const today = new Date();
  const todayIso = isoDate(today);
  if (period === "day") return [todayIso, todayIso];
  if (period === "week") {
    const start = new Date(today);
    start.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
    return [isoDate(start), todayIso];
  }
  if (period === "custom")
    return [query.get("dateFrom") ?? todayIso, query.get("dateTo") ?? todayIso];
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
  return [isoDate(start), isoDate(end)];
}

function sumIn(list: Transaction[], from: string, to: string) {
  let income = 0;
  let paid = 0;
  let pending = 0;
  for (const tx of list) {
    if (tx.date < from || tx.date > to) continue;
    const cents = toCents(tx.amount);
    if (tx.type === "INCOME") income += cents;
    else if (tx.status === "PAID") paid += cents;
    else pending += cents;
  }
  return { income, paid, pending };
}

function dashboard(query: URLSearchParams): DashboardData {
  const period = query.get("period") ?? "month";
  const [from, to] = periodRange(period, query);
  const list = db.transactions.filter((tx) => tx.workspace === workspace());
  const { income, paid, pending } = sumIn(list, from, to);

  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1);
  const spanMs = Date.parse(to) - Date.parse(from) + 86_400_000;
  const previous = sumIn(
    list,
    isoDate(new Date(Date.parse(from) - spanMs)),
    isoDate(new Date(Date.parse(from) - 86_400_000)),
  );

  const year = new Date().getUTCFullYear();
  const currentMonth = new Date().getUTCMonth() + 1;
  const yearlyBreakdown = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, "0")}-31`;
    const sums = sumIn(list, monthStart, monthEnd);
    const fromHistory =
      month < currentMonth - 2 && workspace() === "PERSONAL" ? yearlyHistory[month] : undefined;
    if (month > currentMonth) return { month, income: "0.00", expensesPaid: "0.00" };
    if (fromHistory)
      return { month, income: money(fromHistory[0]), expensesPaid: money(fromHistory[1]) };
    return { month, income: fromCents(sums.income), expensesPaid: fromCents(sums.paid) };
  });

  return {
    summary: {
      totalIncome: fromCents(income),
      totalExpensesPaid: fromCents(paid),
      totalExpensesPending: fromCents(pending),
      balance: fromCents(income - paid),
      expenseRatio: income > 0 ? paid / income : 0,
    },
    previousPeriodIncomeChangePercent:
      previous.income > 0 ? ((income - previous.income) / previous.income) * 100 : null,
    averageDailyExpense: fromCents(Math.round(paid / days)),
    incompleteGoals: db.goals
      .filter((goal) => goal.workspace === workspace() && !goal.completed)
      .map(({ id, title, targetAmount, currentAmount, targetDate }) => ({
        id,
        title,
        targetAmount,
        currentAmount,
        targetDate,
      })),
    yearlyBreakdown,
  };
}

function emptyDashboard(): DashboardData {
  return {
    summary: {
      totalIncome: "0.00",
      totalExpensesPaid: "0.00",
      totalExpensesPending: "0.00",
      balance: "0.00",
      expenseRatio: 0,
    },
    previousPeriodIncomeChangePercent: null,
    averageDailyExpense: "0.00",
    incompleteGoals: [],
    yearlyBreakdown: Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      income: "0.00",
      expensesPaid: "0.00",
    })),
  };
}

// ---------------------------------------------------------------- reports

// Mirrors ReportsService (docs/specs/reports): the range's months, the top
// 5 categories, the weekdays (paid expenses only) and the last 12 months.
function report(query: URLSearchParams): Report {
  const [defaultFrom, defaultTo] = periodRange("month", query);
  const from = query.get("dateFrom") ?? defaultFrom;
  const to = query.get("dateTo") ?? defaultTo;
  const list = db.transactions.filter((tx) => tx.workspace === workspace());
  const inRange = list.filter((tx) => tx.date >= from && tx.date <= to);
  const counts = (tx: Transaction) => tx.type === "INCOME" || tx.status === "PAID";

  const byMonth = new Map<string, { income: number; paid: number }>();
  for (const tx of inRange.filter(counts)) {
    const entry = byMonth.get(tx.date.slice(0, 7)) ?? { income: 0, paid: 0 };
    if (tx.type === "INCOME") entry.income += toCents(tx.amount);
    else if (tx.status === "PAID") entry.paid += toCents(tx.amount);
    byMonth.set(tx.date.slice(0, 7), entry);
  }
  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, sums]) => ({
      month,
      income: fromCents(sums.income),
      expensesPaid: fromCents(sums.paid),
      balance: fromCents(sums.income - sums.paid),
    }));
  const income = [...byMonth.values()].reduce((sum, entry) => sum + entry.income, 0);
  const paid = [...byMonth.values()].reduce((sum, entry) => sum + entry.paid, 0);

  const top = (type: "INCOME" | "EXPENSE") => {
    const totals = new Map<string, number>();
    for (const tx of inRange) {
      if (tx.type !== type || !counts(tx)) continue;
      totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + toCents(tx.amount));
    }
    return [...totals.entries()]
      .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB))
      .slice(0, REPORT_TOP_CATEGORIES)
      .flatMap(([categoryId, cents]) => {
        const category = db.categories.find((entry) => entry.id === categoryId);
        return category
          ? [
              {
                categoryId,
                name: category.name,
                color: category.color,
                icon: category.icon,
                total: fromCents(cents),
              },
            ]
          : [];
      });
  };

  const weekdays = Array.from({ length: 7 }, () => 0);
  for (const tx of inRange) {
    if (tx.type === "EXPENSE" && tx.status === "PAID") {
      weekdays[new Date(`${tx.date}T00:00:00Z`).getUTCDay()]! += toCents(tx.amount);
    }
  }

  const now = new Date();
  const last12Months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1));
    const month = isoDate(date).slice(0, 7);
    const sums = sumIn(list, `${month}-01`, `${month}-31`);
    return { month, income: fromCents(sums.income), expensesPaid: fromCents(sums.paid) };
  });

  return {
    dateFrom: from,
    dateTo: to,
    summary: {
      totalIncome: fromCents(income),
      totalExpensesPaid: fromCents(paid),
      balance: fromCents(income - paid),
      expenseRatio: income > 0 ? paid / income : 0,
    },
    monthly,
    topExpenseCategories: top("EXPENSE"),
    topIncomeCategories: top("INCOME"),
    expensesByWeekday: weekdays.map((cents, weekday) => ({ weekday, total: fromCents(cents) })),
    last12Months,
  };
}

function emptyReport(): Report {
  const [from, to] = periodRange("month", new URLSearchParams());
  const now = new Date();
  return {
    dateFrom: from,
    dateTo: to,
    summary: { totalIncome: "0.00", totalExpensesPaid: "0.00", balance: "0.00", expenseRatio: 0 },
    monthly: [],
    topExpenseCategories: [],
    topIncomeCategories: [],
    expensesByWeekday: Array.from({ length: 7 }, (_, weekday) => ({ weekday, total: "0.00" })),
    last12Months: Array.from({ length: 12 }, (_, index) => ({
      month: isoDate(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + index, 1)),
      ).slice(0, 7),
      income: "0.00",
      expensesPaid: "0.00",
    })),
  };
}

// ---------------------------------------------------------------- helpers

function findOr404<T extends { id: string }>(list: T[], id: string | undefined, path: string): T {
  const item = list.find((entry) => entry.id === id);
  if (!item) fail(404, "Not found.", path);
  return item;
}

function refreshGoal(goal: Goal): Goal {
  goal.progressPercent = Math.min(
    100,
    Math.max(0, (Number(goal.currentAmount) / Number(goal.targetAmount)) * 100),
  );
  goal.updatedAt = now();
  return goal;
}

function debtIndex(id: string | undefined, path: string): number {
  const index = db.debts.findIndex((debt) => debt.id === id);
  if (index < 0) fail(404, "Debt not found.", path);
  return index;
}

function recomputeDebt(index: number): DebtWithInstallments {
  const current = db.debts[index]!;
  const updated = withTotals({ ...current, updatedAt: now() });
  db.debts[index] = updated;
  return updated;
}

function buildInstallments(
  debtId: string,
  total: number,
  count: number,
  startDate: string,
): DebtInstallment[] {
  const base = Math.floor(toCents(total) / count);
  const last = toCents(total) - base * (count - 1);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => {
    const due = new Date(start);
    due.setUTCMonth(start.getUTCMonth() + index);
    return {
      id: `${debtId}-i${index + 1}`,
      installmentNo: index + 1,
      amount: fromCents(index === count - 1 ? last : base),
      dueDate: isoDate(due),
      status: "PENDING",
      paymentDate: null,
      transactionId: null,
    };
  });
}

function withMissing(item: GroceryItem): GroceryItem {
  return { ...item, missing: Number(item.currentQuantity) < Number(item.idealQuantity) };
}

function grocerySummary() {
  const missing = db.groceryItems.filter((item) => item.missing);
  const total = missing.reduce(
    (sum, item) =>
      sum +
      Math.max(0, toCents(item.idealQuantity) - toCents(item.currentQuantity)) *
        Number(item.estimatedPrice),
    0,
  );
  return {
    totalItemCount: db.groceryItems.length,
    missingItemCount: missing.length,
    estimatedPurchaseTotal: fromCents(Math.round(total)),
  };
}

const GROCERY_ORDER = [
  "FOOD",
  "BEVERAGES",
  "MEAT",
  "FROZEN",
  "DAIRY_AND_DELI",
  "PERSONAL_CARE",
  "PRODUCE",
  "CLEANING",
  "PANTRY",
  "BAKERY",
  "PETS",
  "HOUSEHOLD",
];

function sortedGrocery(): GroceryItem[] {
  return [...db.groceryItems].sort(
    (a, b) =>
      GROCERY_ORDER.indexOf(a.category) - GROCERY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name, "pt-BR"),
  );
}

function vehicleFrom(body: Json, base?: Vehicle): Vehicle {
  const merged = { ...(base ?? {}), ...body } as Vehicle;
  return {
    ...merged,
    displayName: `${merged.make} ${merged.model} ${merged.modelYear}`,
    licensePlate: (merged.licensePlate as string | null | undefined) ?? null,
    color: (merged.color as string | null | undefined) ?? null,
    acquisitionDate: (merged.acquisitionDate as string | null | undefined) ?? null,
    fuelType: merged.fuelType ?? null,
    photoUrl: merged.photoUrl ?? null,
    updatedAt: now(),
  };
}

// ---------------------------------------------------------------- routes

const routes: Route[] = [
  // Auth
  { method: "POST", pattern: /^\/auth\/login$/, handler: () => clone(MOCK_TOKENS) },
  {
    method: "POST",
    pattern: /^\/auth\/register$/,
    handler: ({ body }) => ({
      ...clone(MOCK_TOKENS),
      user: { ...MOCK_TOKENS.user, name: String(body.name), email: String(body.email) },
    }),
  },
  { method: "POST", pattern: /^\/auth\/logout$/, handler: () => undefined },
  { method: "POST", pattern: /^\/auth\/refresh$/, handler: () => clone(MOCK_TOKENS) },
  {
    method: "POST",
    pattern: /^\/auth\/password-reset\/request$/,
    handler: () => ({ message: "ok" }),
  },
  {
    method: "POST",
    pattern: /^\/auth\/password-reset\/confirm$/,
    handler: () => ({ message: "ok" }),
  },

  // Profile
  { method: "GET", pattern: /^\/users\/me$/, handler: () => clone(db.profile) },
  {
    method: "PATCH",
    pattern: /^\/users\/me$/,
    handler: ({ body }) => {
      db.profile = {
        ...db.profile,
        ...body,
        phone: (body.phone as string) ?? null,
        phone2: (body.phone2 as string) ?? null,
      } as Profile;
      return clone(db.profile);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/users\/me\/workspace$/,
    handler: ({ body }) => {
      db.profile.activeWorkspace = body.workspace as WorkspaceType;
      return clone(db.profile);
    },
  },
  {
    method: "POST",
    pattern: /^\/users\/me\/change-password$/,
    handler: ({ body, path }) => {
      if (body.currentPassword === "senhaerrada") fail(400, "Current password is incorrect.", path);
      return undefined;
    },
  },

  // Dashboard
  {
    method: "GET",
    pattern: /^\/dashboard$/,
    handler: ({ query }) => dashboard(query),
    empty: emptyDashboard,
  },
  {
    method: "GET",
    pattern: /^\/reports$/,
    handler: ({ query }) => report(query),
    empty: emptyReport,
  },

  // Categories
  {
    method: "GET",
    pattern: /^\/categories$/,
    handler: ({ query }) => {
      const type = query.get("type");
      return clone(db.categories.filter((category) => !type || category.type === type));
    },
    empty: () => [],
  },
  {
    method: "POST",
    pattern: /^\/categories$/,
    handler: ({ body }) => {
      const created: Category = {
        ...(body as Omit<Category, "id" | "createdAt">),
        id: newId("cat"),
        createdAt: now(),
      };
      db.categories.push(created);
      return created;
    },
  },
  {
    method: "PATCH",
    pattern: /^\/categories\/([^/]+)$/,
    handler: ({ params, body, path }) => {
      const category = findOr404(db.categories, params[0], path);
      Object.assign(category, body);
      return clone(category);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/categories\/([^/]+)$/,
    handler: ({ params, query, path }) => {
      const id = params[0];
      findOr404(db.categories, id, path);
      const inUse = db.transactions.some((tx) => tx.categoryId === id);
      const replacement = query.get("replacementCategoryId");
      if (inUse && !replacement) fail(400, "Category is in use.", path);
      if (replacement) {
        for (const tx of db.transactions) if (tx.categoryId === id) tx.categoryId = replacement;
      }
      db.categories = db.categories.filter((category) => category.id !== id);
      return undefined;
    },
  },

  // Transactions
  {
    method: "GET",
    pattern: /^\/transactions$/,
    handler: ({ query }) => {
      const page = Number(query.get("page") ?? 1);
      const perPage = Number(query.get("perPage") ?? 20);
      const type = query.get("type");
      const search = (query.get("search") ?? "").toLocaleLowerCase("pt-BR");
      const list = db.transactions
        .filter((tx) => tx.workspace === workspace())
        .filter((tx) => !type || tx.type === type)
        .filter((tx) => !search || tx.description.toLocaleLowerCase("pt-BR").includes(search))
        .sort((a, b) =>
          a.date === b.date ? b.id.localeCompare(a.id) : b.date.localeCompare(a.date),
        );
      return {
        items: clone(list.slice((page - 1) * perPage, page * perPage)),
        total: list.length,
        page,
        perPage,
      };
    },
    empty: () => ({ items: [], total: 0, page: 1, perPage: 20 }),
  },
  {
    method: "POST",
    pattern: /^\/transactions$/,
    handler: ({ body }) => {
      const months = body.recurring ? Number(body.recurringMonths ?? 1) : 1;
      const created: Transaction[] = [];
      for (let index = 0; index < months; index++) {
        const date = new Date(`${String(body.date)}T00:00:00.000Z`);
        date.setUTCMonth(date.getUTCMonth() + index);
        const tx: Transaction = {
          id: newId("tx"),
          categoryId: String(body.categoryId),
          workspace: workspace(),
          type: body.type as Transaction["type"],
          status:
            body.type === "INCOME" ? "PAID" : ((body.status as Transaction["status"]) ?? "PENDING"),
          description: String(body.description),
          amount: money(Number(body.amount)),
          date: isoDate(date),
          recurring: !!body.recurring,
          createdAt: now(),
          updatedAt: now(),
        };
        created.push(tx);
      }
      db.transactions.push(...created);
      return clone(created[0]);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/transactions\/([^/]+)\/status$/,
    handler: ({ params, body, path }) => {
      const tx = findOr404(db.transactions, params[0], path);
      tx.status = body.status as Transaction["status"];
      tx.updatedAt = now();
      return clone(tx);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/transactions\/([^/]+)$/,
    handler: ({ params, body, path }) => {
      const tx = findOr404(db.transactions, params[0], path);
      Object.assign(
        tx,
        body,
        body.amount !== undefined ? { amount: money(Number(body.amount)) } : {},
      );
      tx.updatedAt = now();
      return clone(tx);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/transactions\/([^/]+)$/,
    handler: ({ params, path }) => {
      findOr404(db.transactions, params[0], path);
      db.transactions = db.transactions.filter((tx) => tx.id !== params[0]);
      return undefined;
    },
  },
  {
    method: "POST",
    pattern: /^\/transactions\/bulk-delete$/,
    handler: ({ body }) => {
      const ids = new Set(body.ids as string[]);
      db.transactions = db.transactions.filter((tx) => !ids.has(tx.id));
      return undefined;
    },
  },

  // Goals
  {
    method: "GET",
    pattern: /^\/goals$/,
    handler: () => clone(db.goals.filter((goal) => goal.workspace === workspace())),
    empty: () => [],
  },
  {
    method: "POST",
    pattern: /^\/goals$/,
    handler: ({ body }) => {
      const goal = refreshGoal({
        id: newId("goal"),
        workspace: workspace(),
        categoryId: (body.categoryId as string) ?? null,
        title: String(body.title),
        description: (body.description as string) ?? null,
        targetAmount: money(Number(body.targetAmount)),
        currentAmount: money(Number(body.currentAmount ?? 0)),
        targetDate: (body.targetDate as string) ?? null,
        completed: false,
        progressPercent: 0,
        createdAt: now(),
        updatedAt: now(),
      });
      db.goals.push(goal);
      return clone(goal);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/goals\/([^/]+)$/,
    handler: ({ params, body, path }) => {
      const goal = findOr404(db.goals, params[0], path);
      Object.assign(goal, body, {
        targetAmount:
          body.targetAmount !== undefined ? money(Number(body.targetAmount)) : goal.targetAmount,
        currentAmount:
          body.currentAmount !== undefined ? money(Number(body.currentAmount)) : goal.currentAmount,
      });
      return clone(refreshGoal(goal));
    },
  },
  {
    method: "DELETE",
    pattern: /^\/goals\/([^/]+)$/,
    handler: ({ params, path }) => {
      findOr404(db.goals, params[0], path);
      db.goals = db.goals.filter((goal) => goal.id !== params[0]);
      return undefined;
    },
  },

  // Debts
  {
    method: "GET",
    pattern: /^\/debts$/,
    handler: () =>
      clone(
        db.debts
          .filter((debt) => debt.workspace === workspace())
          .map(({ installments: _installments, ...debt }) => debt),
      ),
    empty: () => [],
  },
  {
    method: "GET",
    pattern: /^\/debts\/([^/]+)$/,
    handler: ({ params, path }) => clone(db.debts[debtIndex(params[0], path)]),
  },
  {
    method: "POST",
    pattern: /^\/debts$/,
    handler: ({ body }) => {
      const id = newId("debt");
      const total = Number(body.totalAmount);
      const count = Number(body.totalInstallments);
      const created = withTotals({
        id,
        workspace: workspace(),
        categoryId: (body.categoryId as string) ?? null,
        name: String(body.name),
        totalAmount: money(total),
        startDate: String(body.startDate),
        endDate: (body.endDate as string) ?? null,
        interestRate: body.interestRate !== undefined ? money(Number(body.interestRate)) : null,
        notes: (body.notes as string) ?? null,
        totalInstallments: count,
        createdAt: now(),
        updatedAt: now(),
        installments: buildInstallments(id, total, count, String(body.startDate)),
      });
      db.debts.push(created);
      return clone(created);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/debts\/([^/]+)$/,
    handler: ({ params, body, path }) => {
      const index = debtIndex(params[0], path);
      const current = db.debts[index]!;
      const next = { ...current, ...body } as DebtWithInstallments;
      next.totalAmount = money(Number(next.totalAmount));
      next.interestRate =
        body.interestRate === null || body.interestRate === undefined
          ? null
          : money(Number(body.interestRate));
      if (current.paidInstallments === 0) {
        next.installments = buildInstallments(
          current.id,
          Number(next.totalAmount),
          Number(next.totalInstallments),
          next.startDate,
        );
      }
      db.debts[index] = next;
      return clone(recomputeDebt(index));
    },
  },
  {
    method: "DELETE",
    pattern: /^\/debts\/([^/]+)$/,
    handler: ({ params, path }) => {
      debtIndex(params[0], path);
      db.debts = db.debts.filter((debt) => debt.id !== params[0]);
      return undefined;
    },
  },
  {
    method: "POST",
    pattern: /^\/debts\/([^/]+)\/installments\/([^/]+)\/pay$/,
    handler: ({ params, body, path }) => {
      const index = debtIndex(params[0], path);
      const installment = findOr404(db.debts[index]!.installments, params[1], path);
      if (installment.status === "PAID") fail(400, "Installment is already paid.", path);
      installment.status = "PAID";
      installment.paymentDate = String(body.paymentDate);
      return clone(recomputeDebt(index));
    },
  },
  {
    method: "POST",
    pattern: /^\/debts\/([^/]+)\/installments\/([^/]+)\/cancel-payment$/,
    handler: ({ params, path }) => {
      const index = debtIndex(params[0], path);
      const installment = findOr404(db.debts[index]!.installments, params[1], path);
      installment.status = "PENDING";
      installment.paymentDate = null;
      return clone(recomputeDebt(index));
    },
  },

  // Grocery
  {
    method: "GET",
    pattern: /^\/grocery\/items$/,
    handler: () => clone(sortedGrocery()),
    empty: () => [],
  },
  {
    method: "POST",
    pattern: /^\/grocery\/items$/,
    handler: ({ body }) => {
      const item = withMissing({
        id: newId("gi"),
        name: String(body.name),
        unit: String(body.unit),
        idealQuantity: money(Number(body.idealQuantity)),
        currentQuantity: money(Number(body.currentQuantity ?? 0)),
        estimatedPrice: money(Number(body.estimatedPrice)),
        category: body.category as GroceryItem["category"],
        missing: false,
        createdAt: now(),
        updatedAt: now(),
      });
      db.groceryItems.push(item);
      return clone(item);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/grocery\/items\/([^/]+)$/,
    handler: ({ params, body, path }) => {
      const index = db.groceryItems.findIndex((item) => item.id === params[0]);
      if (index < 0) fail(404, "Item not found.", path);
      const current = db.groceryItems[index]!;
      const numeric = (key: "idealQuantity" | "currentQuantity" | "estimatedPrice") =>
        body[key] !== undefined ? money(Number(body[key])) : current[key];
      const next = withMissing({
        ...current,
        ...body,
        idealQuantity: numeric("idealQuantity"),
        currentQuantity: numeric("currentQuantity"),
        estimatedPrice: numeric("estimatedPrice"),
        updatedAt: now(),
      } as GroceryItem);
      db.groceryItems[index] = next;
      return clone(next);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/grocery\/items\/([^/]+)$/,
    handler: ({ params }) => {
      db.groceryItems = db.groceryItems.filter((item) => item.id !== params[0]);
      return undefined;
    },
  },
  {
    method: "GET",
    pattern: /^\/grocery\/budget$/,
    handler: () => clone(db.groceryBudget),
    empty: () => ({ amount: null, setAt: null }),
  },
  {
    method: "POST",
    pattern: /^\/grocery\/budget$/,
    handler: ({ body }) => {
      db.groceryBudget = { amount: money(Number(body.amount)), setAt: now() };
      return clone(db.groceryBudget);
    },
  },
  {
    method: "GET",
    pattern: /^\/grocery\/summary$/,
    handler: () => grocerySummary(),
    empty: () => ({ totalItemCount: 0, missingItemCount: 0, estimatedPurchaseTotal: "0.00" }),
  },

  // Vehicles
  { method: "GET", pattern: /^\/vehicles$/, handler: () => clone(db.vehicles), empty: () => [] },
  {
    method: "GET",
    pattern: /^\/vehicles\/([^/]+)$/,
    handler: ({ params, path }) => clone(findOr404(db.vehicles, params[0], path)),
  },
  {
    method: "POST",
    pattern: /^\/vehicles$/,
    handler: ({ body }) => {
      const created = vehicleFrom({ ...body, id: newId("veh"), createdAt: now() });
      db.vehicles.push(created);
      return clone(created);
    },
  },
  {
    method: "PATCH",
    pattern: /^\/vehicles\/([^/]+)$/,
    handler: ({ params, body, path }) => {
      const current = findOr404(db.vehicles, params[0], path);
      if (
        body.currentMileage !== undefined &&
        Number(body.currentMileage) < current.currentMileage
      ) {
        fail(400, "New mileage cannot be lower than the current mileage.", path);
      }
      const next = vehicleFrom(body, current);
      db.vehicles = db.vehicles.map((vehicle) => (vehicle.id === next.id ? next : vehicle));
      return clone(next);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/vehicles\/([^/]+)$/,
    handler: ({ params }) => {
      db.vehicles = db.vehicles.filter((vehicle) => vehicle.id !== params[0]);
      return undefined;
    },
  },
  {
    method: "PUT",
    pattern: /^\/vehicles\/([^/]+)\/photo$/,
    // The mock can't store the upload; keeps the vehicle as it is.
    handler: ({ params, path }) => clone(findOr404(db.vehicles, params[0], path)),
  },
  {
    method: "DELETE",
    pattern: /^\/vehicles\/([^/]+)\/photo$/,
    handler: ({ params, path }) => {
      const vehicle = findOr404(db.vehicles, params[0], path);
      vehicle.photoUrl = null;
      return clone(vehicle);
    },
  },
];

// Vehicle maintenance — the same rules as the API's alert-status.ts
// (dev-only copy): latest record per type, km signal, time signal, the
// more urgent wins.
const STATUS_RANK: MaintenanceStatus[] = ["ON_TRACK", "WARNING", "URGENT", "OVERDUE"];

function latestRecord(vehicleId: string, typeId: string): MaintenanceRecord | undefined {
  return db.maintenanceRecords
    .filter((record) => record.vehicleId === vehicleId && record.maintenanceTypeId === typeId)
    .sort((a, b) => b.mileage - a.mileage || b.date.localeCompare(a.date))[0];
}

function syncMockAlert(vehicleId: string, type: MaintenanceType): void {
  const vehicle = db.vehicles.find((candidate) => candidate.id === vehicleId);
  const base = latestRecord(vehicleId, type.id)?.mileage ?? vehicle?.currentMileage ?? 0;
  db.maintenanceAlerts[vehicleId] = {
    ...db.maintenanceAlerts[vehicleId],
    [type.id]: base + type.kmInterval,
  };
}

function timeSignal(daysRemaining: number): [MaintenanceStatus, number] | null {
  if (daysRemaining <= 0) return ["OVERDUE", 100];
  if (daysRemaining <= 15) return ["URGENT", 90];
  if (daysRemaining <= 30) return ["WARNING", 80];
  return null;
}

function mockAlerts(vehicle: Vehicle): MaintenanceAlertStatus[] {
  const today = isoDate(new Date());
  return db.maintenanceTypes
    .map((type) => {
      const latest = latestRecord(vehicle.id, type.id);
      const nextMileage =
        db.maintenanceAlerts[vehicle.id]?.[type.id] ??
        (latest?.mileage ?? vehicle.currentMileage) + type.kmInterval;
      const kmRemaining = nextMileage - vehicle.currentMileage;
      let status: MaintenanceStatus;
      let percent: number;
      if (!latest || kmRemaining <= 0) [status, percent] = ["OVERDUE", 100];
      else if (kmRemaining <= type.kmInterval * 0.1) [status, percent] = ["URGENT", 90];
      else if (kmRemaining <= type.kmInterval * 0.2) [status, percent] = ["WARNING", 80];
      else {
        const wear = Math.floor(
          ((vehicle.currentMileage - latest.mileage) / type.kmInterval) * 100,
        );
        [status, percent] = ["ON_TRACK", Math.min(70, Math.max(0, wear))];
      }
      let nextDate: string | null = null;
      let daysRemaining: number | null = null;
      if (latest && type.monthsInterval) {
        const [year, month, day] = latest.date.split("-").map(Number);
        nextDate = isoDate(new Date(Date.UTC(year!, month! - 1 + type.monthsInterval, day)));
        daysRemaining = Math.round(
          (Date.parse(`${nextDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000,
        );
        const time = timeSignal(daysRemaining);
        if (time) {
          if (STATUS_RANK.indexOf(time[0]) > STATUS_RANK.indexOf(status)) status = time[0];
          percent = Math.max(percent, time[1]);
        }
      }
      return {
        maintenanceTypeId: type.id,
        name: type.name,
        system: type.system,
        kmInterval: type.kmInterval,
        monthsInterval: type.monthsInterval,
        status,
        percent,
        nextMileage,
        kmRemaining,
        nextDate,
        daysRemaining,
        lastService: latest ? { date: latest.date, mileage: latest.mileage } : null,
      };
    })
    .sort((a, b) => b.percent - a.percent || a.kmRemaining - b.kmRemaining);
}

function vehicleRecord(vehicleId: string | undefined, id: string | undefined, path: string) {
  return findOr404(
    db.maintenanceRecords.filter((record) => record.vehicleId === vehicleId),
    id,
    path,
  );
}

routes.push(
  {
    method: "GET",
    pattern: /^\/maintenance-types$/,
    // Same order as the API: by system (none last), then name.
    handler: () =>
      clone(
        [...db.maintenanceTypes].sort(
          (a, b) =>
            (a.system === null ? 1 : 0) - (b.system === null ? 1 : 0) ||
            (a.system ?? "").localeCompare(b.system ?? "") ||
            a.name.localeCompare(b.name, "pt-BR"),
        ),
      ),
    empty: () => [],
  },
  {
    method: "POST",
    pattern: /^\/maintenance-types$/,
    handler: ({ body }) => {
      const created: MaintenanceType = {
        id: newId("mt"),
        name: String(body.name),
        description: (body.description as string | undefined) || null,
        system: (body.system as MaintenanceType["system"] | undefined) ?? null,
        kmInterval: Number(body.kmInterval),
        monthsInterval: body.monthsInterval === undefined ? null : Number(body.monthsInterval),
        createdAt: now(),
      };
      db.maintenanceTypes.push(created);
      for (const vehicle of db.vehicles) {
        db.maintenanceAlerts[vehicle.id] = {
          ...db.maintenanceAlerts[vehicle.id],
          [created.id]: vehicle.currentMileage + created.kmInterval,
        };
      }
      return clone(created);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/maintenance-types\/([^/]+)$/,
    handler: ({ params, path }) => {
      findOr404(db.maintenanceTypes, params[0], path);
      if (db.maintenanceRecords.some((record) => record.maintenanceTypeId === params[0])) {
        fail(409, "This maintenance type has maintenance records.", path);
      }
      db.maintenanceTypes = db.maintenanceTypes.filter((type) => type.id !== params[0]);
      return undefined;
    },
  },
  {
    method: "GET",
    pattern: /^\/vehicles\/([^/]+)\/maintenance-alerts$/,
    handler: ({ params, path }) => mockAlerts(findOr404(db.vehicles, params[0], path)),
    empty: () => [],
  },
  {
    method: "GET",
    pattern: /^\/vehicles\/([^/]+)\/maintenance-records$/,
    handler: ({ params, path }) => {
      findOr404(db.vehicles, params[0], path);
      return clone(
        db.maintenanceRecords
          .filter((record) => record.vehicleId === params[0])
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
      );
    },
    empty: () => [],
  },
  {
    method: "POST",
    pattern: /^\/vehicles\/([^/]+)\/maintenance-records$/,
    handler: ({ params, body, path }) => {
      const vehicle = findOr404(db.vehicles, params[0], path);
      const type = db.maintenanceTypes.find((candidate) => candidate.id === body.maintenanceTypeId);
      if (!type) fail(400, "maintenanceTypeId is not one of your maintenance types.", path);
      const mileage = Number(body.mileage);
      if (mileage > vehicle.currentMileage) vehicle.currentMileage = mileage;
      const created: MaintenanceRecord = {
        id: newId("mr"),
        vehicleId: vehicle.id,
        maintenanceTypeId: type.id,
        type: { name: type.name, system: type.system },
        mileage,
        date: String(body.date),
        cost: body.cost === undefined ? null : money(Number(body.cost)),
        location: (body.location as string | undefined) || null,
        notes: (body.notes as string | undefined) || null,
        receipt: null,
        createdAt: now(),
      };
      db.maintenanceRecords.push(created);
      syncMockAlert(vehicle.id, type);
      return clone(created);
    },
  },
  {
    method: "DELETE",
    pattern: /^\/vehicles\/([^/]+)\/maintenance-records\/([^/]+)$/,
    handler: ({ params, path }) => {
      const record = vehicleRecord(params[0], params[1], path);
      db.maintenanceRecords = db.maintenanceRecords.filter(
        (candidate) => candidate.id !== record.id,
      );
      const type = db.maintenanceTypes.find(
        (candidate) => candidate.id === record.maintenanceTypeId,
      );
      if (type) syncMockAlert(record.vehicleId, type);
      return undefined;
    },
  },
  {
    method: "PUT",
    pattern: /^\/vehicles\/([^/]+)\/maintenance-records\/([^/]+)\/receipt$/,
    // The mock can't store the upload; keeps the record as it is.
    handler: ({ params, path }) => clone(vehicleRecord(params[0], params[1], path)),
  },
);

// Subscriptions: no real Stripe in the mock. Checkout starts the 7-day
// trial right away and returns a page the in-app browser can open and
// close; the screen then refetches /me.
const MOCK_PLANS: Plan[] = [
  { plan: "MONTHLY", amount: "9.90", currency: "BRL", interval: "month", trialDays: 7 },
  { plan: "ANNUAL", amount: "65.34", currency: "BRL", interval: "year", trialDays: 7 },
];

function mockSubscriptionChange(changes: Partial<Subscription>, path: string): Subscription {
  if (!db.subscription) fail(404, "No active subscription.", path);
  db.subscription = { ...db.subscription, ...changes, updatedAt: now() };
  return clone(db.subscription);
}

routes.push(
  { method: "GET", pattern: /^\/subscriptions\/plans$/, handler: () => clone(MOCK_PLANS) },
  {
    method: "GET",
    pattern: /^\/subscriptions\/me$/,
    handler: () => ({ subscription: clone(db.subscription) }),
    empty: () => ({ subscription: null }),
  },
  {
    method: "POST",
    pattern: /^\/subscriptions\/checkout$/,
    handler: ({ body, path }) => {
      if (db.subscription && db.subscription.status !== "CANCELED") {
        fail(409, "You already have a subscription.", path);
      }
      const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString();
      db.subscription = {
        plan: body.plan === "MONTHLY" ? "MONTHLY" : "ANNUAL",
        status: db.subscription ? "ACTIVE" : "TRIALING",
        currentPeriodEnd: inAWeek,
        trialEndsAt: db.subscription ? null : inAWeek,
        cancelScheduled: false,
        updatedAt: now(),
      };
      return { url: "https://example.com/?mony-mock-checkout" };
    },
  },
  {
    method: "POST",
    pattern: /^\/subscriptions\/cancel$/,
    handler: ({ path }) => mockSubscriptionChange({ cancelScheduled: true }, path),
  },
  {
    method: "POST",
    pattern: /^\/subscriptions\/reactivate$/,
    handler: ({ path }) => mockSubscriptionChange({ cancelScheduled: false }, path),
  },
  {
    method: "POST",
    pattern: /^\/subscriptions\/portal$/,
    handler: () => ({ url: "https://example.com/?mony-mock-portal" }),
  },
);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function mockFetch<T>(rawPath: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const [path = "", search = ""] = rawPath.split("?");
  const query = new URLSearchParams(search);
  const body: Json = typeof init?.body === "string" ? (JSON.parse(init.body) as Json) : {};

  const route = routes.find(
    (candidate) => candidate.method === method && candidate.pattern.test(path),
  );
  if (!route) fail(404, `Mock route not found: ${method} ${path}`, path);

  const { dataState } = useDesignLab.getState();
  if (method === "GET" && dataState === "loading") {
    // Never settles, so skeletons stay on screen for review.
    return new Promise<T>(() => undefined);
  }
  await wait(LATENCY_MS);
  if (method === "GET" && dataState === "error") fail(500, "Internal server error.", path);
  if (method === "GET" && dataState === "empty" && route.empty) return route.empty() as T;

  const params = (route.pattern.exec(path) ?? []).slice(1);
  return route.handler({ params, query, body, path }) as T;
}
