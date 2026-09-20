# Design — Dashboard

## Data model (Prisma)

No new models — reads `Transaction` (from `transactions`) and `Goal`
(from `goals`, which lands right before this feature in the roadmap).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/dashboard?period=day\|week\|month\|custom&dateFrom=&dateTo=` | Bearer | — | `DashboardDto` | 400 (bad custom range), 401 |

`DashboardDto`:
```ts
{
  summary: {
    totalIncome: string; totalExpensesPaid: string; totalExpensesPending: string;
    balance: string; expenseRatio: number;
  };
  previousPeriodIncomeChangePercent: number | null; // null if previous period had 0 income
  averageDailyExpense: string;
  incompleteGoals: Array<{ id: string; title: string; targetAmount: string; currentAmount: string; targetDate: string | null }>;
  yearlyBreakdown: Array<{ month: number; income: string; expensesPaid: string }>;
}
```

Implementation reuses `TransactionsService`'s summary logic (from the
`transactions` feature) rather than duplicating the SQL — this endpoint
composes existing services, it doesn't own new business logic beyond the
period-comparison and yearly-breakdown shaping.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `DashboardScreen` (home tab) | `/` | `GET /dashboard` | — | Summary card, period selector (day/week/month/custom), comparison badge, goals preview list (tap → `goals` feature's screen), yearly bar/line chart |

## Shared types

`packages/shared-types/src/dashboard.ts`: `DashboardData`,
`DashboardPeriod` zod schema/type.

## Error handling

- Custom range with `dateFrom > dateTo` → 400, caught client-side before
  request too.
- Empty state (no transactions yet) → summary shows zeros, not an error;
  yearly chart renders with all-zero bars, not hidden.
