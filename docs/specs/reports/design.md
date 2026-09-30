# Design — Reports

## Data model (Prisma)

No new models. Reads `Transaction` (joined to `Category` for the top
categories). The existing `(userId, workspace, date)` index covers every
query below.

## API surface

| Method | Path                         | Auth   | Request                                                                           | Response    | Errors                                                    |
| ------ | ---------------------------- | ------ | --------------------------------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| GET    | `/reports?dateFrom=&dateTo=` | Bearer | `dateFrom`, `dateTo`: `YYYY-MM-DD`, both or neither (neither → the current month) | `ReportDto` | 400 (one date only, bad format, `dateFrom > dateTo`), 401 |

`ReportDto` (money as decimal strings, like the dashboard):

```ts
{
  dateFrom: string;                  // the resolved range, YYYY-MM-DD
  dateTo: string;
  summary: {
    totalIncome: string;
    totalExpensesPaid: string;
    balance: string;                 // income − expenses paid
    expenseRatio: number;            // expenses / income (0 when no income); 0.72 = 72%
  };
  monthly: Array<{ month: string; income: string; expensesPaid: string; balance: string }>;
                                     // "YYYY-MM", months with transactions in the range, oldest first
  topExpenseCategories: Array<ReportCategoryDto>;   // ≤ 5, largest first
  topIncomeCategories: Array<ReportCategoryDto>;    // ≤ 5, largest first
  expensesByWeekday: Array<{ weekday: number; total: string }>;
                                     // 7 items, 0 = Sunday … 6 = Saturday
  last12Months: Array<{ month: string; income: string; expensesPaid: string }>;
                                     // 12 items: 11 months ago … the current month
}
ReportCategoryDto = { categoryId: string; name: string; color: string; icon: string; total: string }
```

### Queries (`ReportsService`)

The active workspace is read fresh from the user row (never the JWT
claim), as the dashboard does. Then four queries run in parallel; each
aggregates in Postgres so the cost doesn't grow with the number of rows
sent to Node (a multi-year range is one grouped scan, not thousands of
rows):

1. **Monthly** over the range — `$queryRaw` (tagged template,
   parameterized): `to_char(date, 'YYYY-MM')` grouped, `SUM(amount)
FILTER (WHERE type='INCOME')` and `FILTER (WHERE type='EXPENSE' AND
status='PAID')`. The period summary is the sum of these rows (no extra
   query).
2. **Top categories** — two `transaction.groupBy({ by: ["categoryId"],
_sum: amount, orderBy: _sum desc, take: 5 })` (income; paid expenses),
   then one `category.findMany({ where: { id: { in } } })` for name,
   color and icon.
3. **Weekday** over the range — `$queryRaw`: `EXTRACT(DOW FROM date)`
   (0 = Sunday, like legacy's `DAYOFWEEK − 1`) over paid expenses,
   filled to seven entries in JS.
4. **Last 12 months** — query 1's shape over [first day of the month 11
   months ago, last day of the current month], filled to twelve entries.

The monthly queries only group rows that count (income, or paid
expenses): a month holding only pending expenses — recurring ones are
generated ahead — isn't a month of the report. "Today" is the server's
UTC date, as on the dashboard: from 21:00 to midnight BRT on a month's
last day the 12-month window already shows the next month (known, shared
with the dashboard; the app always sends the range explicitly).

Every expense sum filters `status = 'PAID'`, with a comment pointing at
`product.md`'s decision so nobody "fixes" it back to legacy.

`GET /reports` is a read with no side effects; Swagger documents the
query, the response (with a real example) and the 400/401.

## Mobile

### `ReportsScreen`

Route `Reports` (app stack), from a new row **Mais → "Relatórios"**
(icon `stats-chart-outline`, testID `more-reports`), in the same group as
the other money screens.

Reads `GET /reports`, query key `["reports", workspace, dateFrom,
dateTo]`, `staleTime` 5 min; saving a transaction or touching a debt
invalidates `["reports"]`; refetched on focus only when stale; pull to
refresh. While a date is incomplete or the new range loads, the last
report stays on screen dimmed (never another notebook's), and the hero's
period comes from the report's own dates.

Composition (design system "Índigo Suave"; full spec in
`design/telas.md` §29):

1. **Period card** — "De" / "Até" masked date fields (DD/MM/AAAA, the
   dashboard's custom-range pattern), pre-filled with the current month.
   The report reloads as soon as both dates are valid and in order; an
   inverted range shows an inline pt-BR error and doesn't query. The
   active notebook is named in the hero's period chip ("01/07 –
   30/09/2026 · Pessoal" / "· Empresa"), as legacy's title did.
2. **Resumo do período** — income (+, green), expenses paid (−, red),
   balance, and the "Despesas em relação às receitas" bar with legacy's
   70/90 colors and messages.
3. **Receitas × despesas por mês** — the last 3 months of `monthly`:
   paired bars (income green, expenses indigo, like `YearChart`) with each
   month's balance under it.
4. **Evolução anual** — `last12Months` as two lines (income, expenses).
5. **Despesas por categoria** / **Receitas por categoria** — a donut in
   the categories' own colors and a legend with the value and share of
   the top 5.
6. **Despesas por dia da semana** — seven bars, Dom … Sáb, the largest
   highlighted.
7. **Resumo mensal** — every month of `monthly`: month, income,
   expenses, balance and the ratio bar (80/100 colors).

Each section has its own empty state ("Sem despesas pagas no período."
etc.); a range with nothing at all shows one empty state instead of six.
Loading: skeletons in the shape of the sections. Error: `ErrorState`
with retry.

Charts are hand-rolled with `react-native-svg` / Reanimated, following
`YearChart` (no chart library — `tech.md`). New domain components live
in `components/domain/` (names settled in the design pass:
`design/componentes.md`).

Accessibility: every chart has a spoken summary (`spokenMoney`); the
donut's legend and the bars are readable as lists.

## Shared types

`packages/shared-types/src/report.ts`: `reportSchema` (and the
category/month item schemas) + `reportQuerySchema` (both dates or
neither, `dateFrom ≤ dateTo`), inferred types.

## Error handling

- Bad range → 400 "dateFrom must not be after dateTo." / "dateFrom and
  dateTo must be given together."; the app validates first and never
  shows the API message.
- Empty range → zeros and empty lists (sections render empty states).
