# Design — Transactions

## Data model (Prisma)

```prisma
enum TransactionType {
  INCOME
  EXPENSE
}

enum TransactionStatus {
  PAID
  PENDING
}

model Transaction {
  id           String             @id @default(uuid())
  userId       String
  user         User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  categoryId   String
  category     Category           @relation(fields: [categoryId], references: [id])
  workspace    WorkspaceType
  type         TransactionType
  status       TransactionStatus  @default(PENDING)
  description  String             @db.VarChar(255)
  amount       Decimal            @db.Decimal(12, 2)
  date         DateTime           @db.Date
  recurring    Boolean            @default(false)
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt

  debtInstallment DebtInstallment? // added by the `debts` feature (reverse relation)

  @@index([userId, workspace, date])
  @@index([userId, workspace, type, status])
}
```

`amount` is `Decimal`, never `Float` — money is never represented as a
binary float anywhere in this codebase (API or mobile calculations).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/transactions` | Bearer | query params (see below) | `PaginatedTransactionsDto` | 401 |
| POST | `/transactions` | Bearer | `CreateTransactionDto` | `TransactionDto` or `TransactionDto[]` if recurring | 400, 401, 404 (category) |
| PATCH | `/transactions/:id` | Bearer | `UpdateTransactionDto` | `TransactionDto` | 400, 401, 404 |
| PATCH | `/transactions/:id/status` | Bearer | `{ status: "PAID" \| "PENDING" }` | `TransactionDto` | 400 (non-expense), 401, 404 |
| DELETE | `/transactions/:id` | Bearer | — | 204 | 401, 404 |
| POST | `/transactions/bulk-delete` | Bearer | `{ ids: string[] }` | 204 | 400, 401 |
| GET | `/transactions/summary?dateFrom=&dateTo=` | Bearer | — | `TransactionSummaryDto` | 401 |

`CreateTransactionDto`:
```ts
{
  categoryId: string;
  type: "INCOME" | "EXPENSE";
  status?: "PAID" | "PENDING"; // ignored/forced PAID if type=INCOME
  description: string;
  amount: number; // positive, 2 decimal places
  date: string; // ISO date
  recurring?: boolean;
  recurringMonths?: number; // 1-60, required if recurring=true
}
```

`TransactionSummaryDto`:
```ts
{ totalIncome: string; totalExpensesPaid: string; totalExpensesPending: string; balance: string }
```
(amounts serialized as decimal strings, never floats, to avoid client-side
precision loss — mobile formats them with a currency-formatting utility in
`packages/shared-types`.)

List query params: `type`, `categoryId`, `dateFrom`, `dateTo`, `status`,
`search`, `page`, `perPage` (default 20), `sortBy` (allow-list: `date` |
`amount` | `description`), `sortOrder`. All list/summary endpoints
implicitly filter by `user.activeWorkspace` server-side (client never
passes workspace explicitly — it's derived from the authenticated user).

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `TransactionsListScreen` | `/transactions` | `GET /transactions` | — | Filters (type/category/date/status/search), infinite scroll pagination via TanStack Query |
| `TransactionFormScreen` | `/transactions/new`, `/transactions/:id/edit` | `GET /categories` | `POST`/`PATCH /transactions` | Type toggle (income/expense) drives status field visibility; recurring toggle reveals months input |
| Status toggle | inline on list/detail | — | `PATCH /transactions/:id/status` | Only rendered for expense rows |

## Shared types

`packages/shared-types/src/transaction.ts`: `Transaction`,
`CreateTransactionInput`, `UpdateTransactionInput`, `TransactionSummary`
zod schemas, `TransactionType`, `TransactionStatus`. Also a
`formatCurrency(amountString)` helper used by both `dashboard` and
`reports` mobile screens later.

## Error handling

- Recurring creation returning an array vs. a single object — mobile
  `api-client` typed to handle both shapes based on the `recurring` flag
  sent.
- Bulk delete partial-failure is not possible by design (all-or-nothing
  Prisma `$transaction`) — client only needs to handle full success or
  full failure.
- Status-change rejection (non-expense) — UI should never allow this
  (button hidden on income rows), server check is defense-in-depth.
