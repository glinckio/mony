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
  category           Category?     @relation(fields: [categoryId], references: [id])
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
  transaction    Transaction?      @relation(fields: [transactionId], references: [id])

  @@index([debtId, status])
}
```

## API surface

| Method | Path | Auth | Request DTO | Response DTO | Error cases |
|---|---|---|---|---|---|
| GET | `/debts?status=` | Bearer | — | `DebtDto[]` | 401 |
| GET | `/debts/:id` | Bearer | — | `DebtWithInstallmentsDto` | 401, 404 |
| POST | `/debts` | Bearer | `CreateDebtDto` | `DebtWithInstallmentsDto` | 400, 401 |
| PATCH | `/debts/:id` | Bearer | `UpdateDebtDto` | `DebtWithInstallmentsDto` | 400 (installment count change with paid installments), 401, 404 |
| DELETE | `/debts/:id` | Bearer | — | 204 | 401, 404 |
| POST | `/debts/:id/installments/:installmentId/pay` | Bearer | `{ paymentDate: string; paidAmount: number }` | `DebtWithInstallmentsDto` | 400, 401, 404 |
| POST | `/debts/:id/installments/:installmentId/cancel-payment` | Bearer | — | `DebtWithInstallmentsDto` | 401, 404 |

All installment-generation and recomputation logic lives in
`DebtsService`, wrapped in Prisma `$transaction` calls (installment +
linked-transaction creation must be atomic — a debt should never end up
with installments but no linked transactions, or vice versa).

`DebtsService` depends on `TransactionsService` (create/update linked
transactions) — this is the one place `docs/steering/structure.md`'s
"no cross-feature service imports" rule needs a named exception: debts
legitimately owns transaction lifecycle for its own installments. Document
this exception directly in `DebtsService`'s file-level comment.

## Mobile screens

| Screen | Route | Reads | Writes | Notes |
|---|---|---|---|---|
| `DebtsListScreen` | `/debts` | `GET /debts` | — | Grouped/filterable by status, progress bar per debt (`paidInstallments/totalInstallments`) |
| `DebtDetailScreen` | `/debts/:id` | `GET /debts/:id` | — | Installment list with due dates, pay/cancel-payment actions |
| `DebtFormScreen` | `/debts/new`, `/debts/:id/edit` | `GET /categories` | `POST`/`PATCH /debts` | `interestRate` field shown but labeled informational (matches product decision) |
| Pay-installment sheet | inline on `DebtDetailScreen` | — | `POST .../pay` | Payment date + amount, defaults amount to the installment's own amount |

## Shared types

`packages/shared-types/src/debt.ts`: `Debt`, `DebtInstallment`,
`CreateDebtInput`, `UpdateDebtInput`, `DebtStatus`, `InstallmentStatus`.

## Error handling

- Installment-count change blocked by paid installments → surfaced as a
  disabled field + explanatory text in `DebtFormScreen`, not just a 400
  toast after submit.
- Pay/cancel-payment race (two taps) → button disabled during the
  in-flight mutation (TanStack Query `isPending`).
