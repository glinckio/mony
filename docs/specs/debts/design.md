# Design — Debts

## Data model (Prisma)

```prisma
enum DebtStatus {
  ACTIVE
  PAID_OFF
  OVERDUE
}

enum InstallmentStatus {
  PENDING
  PAID
}

model Debt {
  id                 String        @id @default(uuid())
  userId             String
  user               User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace          WorkspaceType
  categoryId         String?
  category           Category?     @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  name               String        @db.VarChar(100)
  totalAmount        Decimal       @db.Decimal(12, 2)
  paidAmount         Decimal       @default(0) @db.Decimal(12, 2)
  startDate          DateTime      @db.Date
  endDate            DateTime?     @db.Date
  interestRate       Decimal?      @db.Decimal(5, 2) // informational only, never applied — see product.md
  totalInstallments  Int
  paidInstallments   Int           @default(0)
  notes              String?       @db.VarChar(500)
  status             DebtStatus    @default(ACTIVE)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  installments DebtInstallment[]

  @@index([userId, workspace, status])
  @@index([categoryId])
}

model DebtInstallment {
  id             String            @id @default(uuid())
  debtId         String
  debt           Debt              @relation(fields: [debtId], references: [id], onDelete: Cascade)
  installmentNo  Int
  amount         Decimal           @db.Decimal(12, 2)
  dueDate        DateTime          @db.Date
  status         InstallmentStatus @default(PENDING)
  paymentDate    DateTime?         @db.Date
  transactionId  String?           @unique
  transaction    Transaction?      @relation(fields: [transactionId], references: [id], onDelete: SetNull)

  @@index([debtId, status, dueDate]) // covers the stale-OVERDUE refresh's dueDate < today filter
}
```

`Transaction` gets the reverse relation `debtInstallment DebtInstallment?`;
`User` and `Category` get `debts Debt[]`. `transactionId`'s `@unique`
already indexes the reverse lookup the transaction-status sync needs.
`@@index([categoryId])` on `Debt` mirrors `Transaction`/`Goal` (FK hit by
category delete's `SET NULL`/reassignment).

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/debts?status=` | Bearer | `ListDebtsQueryDto` | `DebtDto[]` | 400, 401 |
| GET | `/debts/:id` | Bearer | — | `DebtWithInstallmentsDto` | 401, 404 |
| POST | `/debts` | Bearer | `CreateDebtDto` | `DebtWithInstallmentsDto` | 400 (validation, cent split, no expense category, income category, endDate < startDate), 401, 404 (category) |
| PATCH | `/debts/:id` | Bearer | `UpdateDebtDto` | `DebtWithInstallmentsDto` | 400 (installment count / start date change with paid installments, total below already paid, validation), 401, 404 |
| DELETE | `/debts/:id` | Bearer | — | 204 | 401, 404 |
| POST | `/debts/:id/installments/:installmentId/pay` | Bearer | `PayInstallmentDto` `{ paymentDate: string; paidAmount: number }` | `DebtWithInstallmentsDto` | 400 (validation, already paid), 401, 404 |
| POST | `/debts/:id/installments/:installmentId/cancel-payment` | Bearer | — | `DebtWithInstallmentsDto` | 400 (not paid), 401, 404 |

`DebtDto`: `id, workspace, categoryId, name, totalAmount, paidAmount,
remainingAmount, startDate, endDate, interestRate, totalInstallments,
paidInstallments, notes, status, createdAt, updatedAt`. Money fields are
decimal strings (same convention as every other DTO); `remainingAmount`
= `totalAmount - paidAmount`, computed server-side with `Prisma.Decimal`
so the client never does money arithmetic on floats. `interestRate` is a
decimal string or `null`.

`DebtWithInstallmentsDto` = `DebtDto` + `installments:
DebtInstallmentDto[]` (ordered by `installmentNo`): `id, installmentNo,
amount, dueDate, status, paymentDate, transactionId`.

`GET /debts` isn't paginated — a user has a handful of debts, not
thousands (same call as `GET /goals`). Ordered `startDate desc,
createdAt desc` (legacy default `data_inicio DESC`).

Ownership: every `:id`/`:installmentId` lookup is scoped to `userId`
(installment → its debt → `userId`), 404 otherwise — never 403, so ids
of other users' rows aren't confirmable. Like goals/transactions,
by-id routes aren't workspace-scoped; only the list is.

### Service layout / module boundary

All installment-generation and recomputation logic lives in
`DebtsService`, inside Prisma interactive `$transaction(async (tx) =>
...)` calls — installment + linked-transaction writes must be atomic (a
debt should never end up with installments but no linked transactions,
or vice versa).

**Change from the first draft of this design:** `DebtsService` does
**not** import `TransactionsService`. `TransactionsService`'s methods
each use the root Prisma client, not a caller-supplied transaction
client, so calling them from inside `DebtsService`'s `$transaction`
would silently break the atomicity requirement above. `DebtsService`
writes its linked `Transaction` rows directly through its own `tx`
instead — it owns the lifecycle of those rows, and no transaction
business rule (category/type validation, income-forces-PAID) applies to
them beyond what `DebtsService` already enforces (expense-only category).
So no exception to `structure.md`'s no-cross-import rule is needed.

The reverse direction — `PATCH /transactions/:id/status` on a linked
transaction syncing its installment and recomputing the debt — lives in
`src/common/debt-sync/debt-sync.ts`: plain functions over a
`Prisma.TransactionClient` (`recomputeDebt`, `syncInstallmentFromTransactionStatus`,
plus the pure `deriveDebtStatus`/`splitAmount` helpers). Both
`DebtsService` and `TransactionsService` call into it; neither imports
the other's module. This is `structure.md`'s "shared service in
`src/common`" route, not an exception to it.

`CategoriesService#delete` with `replacementCategoryId` also reassigns
the user's debts on that category (alongside the transactions it
already reassigns). Without a replacement, the debt keeps existing and
its `categoryId` goes null via `onDelete: SetNull` — but that path is
only reachable when no transaction uses the category, and a debt's
linked transactions normally do.

### Stale-status refresh

`list()` and `findOne()` first run one
`debt.updateMany({ where: { userId, status: ACTIVE, installments: { some:
{ status: PENDING, dueDate: { lt: today } } } }, data: { status: OVERDUE } })`
— a single statement, no per-debt loop. See requirements.md "Status
derivation" for why only this one transition needs it.

"Today" is the UTC date (`todayDateOnlyString()`), same as every other
date comparison in the API.

## Mobile screens

Navigation (owner decision 2026-09-23): the `Categorias` tab becomes a
**`Mais`** tab (`MoreScreen`) — a menu listing `Categorias` and
`Dívidas`, and every later non-tab feature (Mercado, Veículos,
Relatórios, Assinatura...). `Categories`, `Debts`, and `DebtDetail` are
pushed on `AppStack` (like `ChangePassword`), so they carry a back
button via `AppHeader`'s new `onBack` prop. See
`docs/specs/navigation/design.md` for the tab-bar amendment.

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `MoreScreen` | tab `More` | — | — | Menu rows → `Categories`, `Debts` |
| `DebtsListScreen` | stack `Debts` | `GET /debts` | — | Grouped by status (Atrasadas, Ativas, Quitadas); progress bar per debt (`paidInstallments/totalInstallments`), paid vs total amounts |
| `DebtDetailScreen` | stack `DebtDetail { debtId }` | `GET /debts/:id` | `POST .../cancel-payment`, `DELETE /debts/:id` | Summary card + installment list with due dates, status badges, pay/cancel-payment actions |
| `DebtFormScreen` | modal `DebtForm { debt? }` | `GET /categories?type=EXPENSE` | `POST`/`PATCH /debts` | `interestRate` shown but labeled informational (matches product decision). Installment-count + start-date fields disabled with explanatory text when `paidInstallments > 0`. Warns (and blocks submit) when the user has no expense category yet. |
| `PayInstallmentSheet` | inline on `DebtDetailScreen` | — | `POST .../pay` | Payment date (defaults today) + amount (defaults to the installment's own amount), built on a new `BottomSheet` ui component |

New `components/ui/` pieces: `BottomSheet` (modal sheet over `overlay`
backdrop), `Badge` (tone-colored pill — `success`/`danger`/`warning`/
`info`/`neutral`), `ListRow` (icon + label + chevron menu row used by
`MoreScreen`), and `AppHeader`'s `onBack`.

Cache invalidation: debt mutations invalidate `["debts"]`, `["debt",
id]`, `["transactions"]`, and `["dashboard"]` (linked transactions move
totals). `TransactionsListScreen`'s status toggle additionally
invalidates `["debts"]`/`["debt"]`, since toggling a linked transaction
now pays/unpays its installment.

## Shared types

`packages/shared-types/src/debt.ts`: `debtStatusSchema`/`DebtStatus`,
`installmentStatusSchema`/`InstallmentStatus`, `debtSchema`/`Debt`,
`debtInstallmentSchema`/`DebtInstallment`,
`debtWithInstallmentsSchema`/`DebtWithInstallments`,
`createDebtInputSchema`/`CreateDebtInput`,
`updateDebtInputSchema`/`UpdateDebtInput`,
`payInstallmentInputSchema`/`PayInstallmentInput` (pt-BR messages), plus
`MAX_DEBT_INSTALLMENTS = 420`.

## Error handling

- Installment-count/start-date change blocked by paid installments →
  surfaced as disabled fields + explanatory text in `DebtFormScreen`, not
  just a 400 toast after submit.
- No expense category → banner in `DebtFormScreen` with a shortcut to
  create one, submit disabled.
- Pay/cancel-payment race (two taps) → button disabled during the
  in-flight mutation (TanStack Query `isPending`). Server-side, every
  debt mutation first takes a `SELECT ... FOR UPDATE` row lock on the
  debt (`lockDebt`), so a second concurrent pay of the same installment
  sees it already PAID (400), and concurrent pays of *different*
  installments can't recompute the debt from stale snapshots.
- Any other API failure → generic pt-BR copy ("Algo deu errado. Tente
  novamente."), never the API's English `message`.
