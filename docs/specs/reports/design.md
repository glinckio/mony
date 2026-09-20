# Design — Reports

## Data model (Prisma)

No new models — reads `Transaction` only, via `ReportsService`, which
composes `TransactionsService` where possible and adds the
report-specific aggregation queries (monthly grouping, running balance,
weekday distribution) that don't belong in `TransactionsService`.

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/reports?dateFrom=&dateTo=` | Bearer | — | `ReportDto` | 400 (bad range), 401 |

`ReportDto`:
```ts
{
  monthlySummary: Array<{ month: string; income: string; expensesPaid: string; balance: string }>;
  categoryTotals: Array<{ categoryId: string; categoryName: string; type: "INCOME" | "EXPENSE"; total: string }>;
  dailyRunningBalance: Array<{ date: string; runningBalance: string }>;
  topIncomeCategories: Array<{ categoryId: string; categoryName: string; total: string }>; // max 5
  trailing12Months: Array<{ month: string; income: string; expensesPaid: string }>;
  expenseByWeekday: Array<{ weekday: number; total: string }>; // 0=Sunday .. 6=Saturday
}
```

All expense aggregation in every sub-report filters `status=PAID`
consistently — this is the one deliberate fix vs. legacy, called out
directly in `ReportsService` with a comment linking back to
`product.md`'s decision table so a future reader doesn't "fix" it back to
matching legacy's bug.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `ReportsScreen` | `/reports` | `GET /reports` | — | Date-range picker, tabs or scroll sections per sub-report, chart lib matches whatever was chosen for `dashboard`'s yearly chart (reuse, don't introduce a second charting library) |

## Shared types

`packages/shared-types/src/report.ts`: `Report` zod schema/type.

## Error handling

- Bad date range → 400 caught client-side before request, same pattern as
  `dashboard`'s custom range.
- Empty range (no transactions) → all arrays return empty/zeroed, not an
  error — charts render empty states.
