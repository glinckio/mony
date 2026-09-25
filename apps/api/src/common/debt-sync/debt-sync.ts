import { Prisma, type DebtStatus, type InstallmentStatus } from "@prisma/client";

import { parseDateOnly } from "../utils/date.util";

// Debt <-> linked-transaction bookkeeping shared by DebtsService (which
// owns installments) and TransactionsService (whose status endpoint must
// keep a linked installment in sync — legacy `atualizarStatusTransacao`).
// Lives in src/common so neither feature module imports the other; see
// docs/specs/debts/design.md "Service layout / module boundary". Every
// function that writes takes the caller's interactive-transaction client,
// so the sync is atomic with whatever triggered it.

const ONE_CENT = new Prisma.Decimal("0.01");

// Flat division to the cent (never interest — see product.md): every
// installment gets floor(total / count) and the last one absorbs the
// remainder, so they always sum to exactly `total`. Callers must check
// `coversOneCentEach` first — otherwise the base rounds down to 0.00.
export function splitAmount(total: Prisma.Decimal, count: number): Prisma.Decimal[] {
  const base = total.dividedBy(count).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
  const last = total.minus(base.times(count - 1));
  return Array.from({ length: count }, (_, index) => (index === count - 1 ? last : base));
}

export function coversOneCentEach(total: Prisma.Decimal, count: number): boolean {
  return total.greaterThanOrEqualTo(ONE_CENT.times(count));
}

// User-visible stored text shown in the (pt-BR) transactions list — so
// pt-BR, matching legacy rows, not an English identifier.
export function installmentDescription(
  installmentNo: number,
  totalInstallments: number,
  debtName: string,
): string {
  return `Parcela ${installmentNo}/${totalInstallments} - ${debtName}`;
}

// Re-renders every linked transaction's description after a rename —
// one UPDATE ... FROM instead of one query per installment (up to
// MAX_DEBT_INSTALLMENTS). Must produce exactly what
// `installmentDescription` does.
export async function renameLinkedTransactions(
  tx: Prisma.TransactionClient,
  debtId: string,
  totalInstallments: number,
  debtName: string,
): Promise<void> {
  const suffix = `/${totalInstallments} - ${debtName}`;
  await tx.$executeRaw`
    UPDATE "Transaction" AS t
    SET "description" = 'Parcela ' || i."installmentNo"::text || ${suffix}, "updatedAt" = NOW() AT TIME ZONE 'UTC'
    FROM "DebtInstallment" AS i
    WHERE i."transactionId" = t."id" AND i."debtId" = ${debtId}`;
}

interface InstallmentSnapshot {
  status: InstallmentStatus;
  amount: Prisma.Decimal;
  dueDate: Date;
}

export interface DebtTotals {
  paidAmount: Prisma.Decimal;
  paidInstallments: number;
  status: DebtStatus;
}

// PAID_OFF once every installment is paid; else OVERDUE if any pending
// one is past due (strictly before today); else ACTIVE — legacy
// `atualizarInfoDivida`.
export function computeDebtTotals(installments: InstallmentSnapshot[], today: string): DebtTotals {
  const todayDate = parseDateOnly(today);
  let paidAmount = new Prisma.Decimal(0);
  let paidInstallments = 0;
  let hasOverdue = false;

  for (const installment of installments) {
    if (installment.status === "PAID") {
      paidAmount = paidAmount.plus(installment.amount);
      paidInstallments++;
    } else if (installment.dueDate < todayDate) {
      hasOverdue = true;
    }
  }

  const status: DebtStatus =
    installments.length > 0 && paidInstallments === installments.length
      ? "PAID_OFF"
      : hasOverdue
        ? "OVERDUE"
        : "ACTIVE";

  return { paidAmount, paidInstallments, status };
}

// Row-locks the debt (`SELECT ... FOR UPDATE`) for the rest of the
// caller's transaction. Every path that changes installments or
// recomputes a debt takes this first: without it, two concurrent
// payments on different installments of the same debt could each
// recompute from a snapshot missing the other's (still uncommitted)
// payment, and the last `debt.update` would win with a stale total.
// With `userId`, doubles as the ownership check — returns false when the
// debt doesn't exist or isn't theirs.
export async function lockDebt(
  tx: Prisma.TransactionClient,
  debtId: string,
  userId?: string,
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Debt"
    WHERE "id" = ${debtId} ${userId ? Prisma.sql`AND "userId" = ${userId}` : Prisma.empty}
    FOR UPDATE`;
  return rows.length > 0;
}

// Locks the debt owning the installment linked to `transactionId`, if
// any. Returns false (nothing locked) for an unlinked transaction.
export async function lockLinkedDebt(
  tx: Prisma.TransactionClient,
  transactionId: string,
): Promise<boolean> {
  const linked = await tx.debtInstallment.findUnique({
    where: { transactionId },
    select: { debtId: true },
  });
  if (!linked) return false;
  await lockDebt(tx, linked.debtId);
  return true;
}

// One read of the debt's installments (at most MAX_DEBT_INSTALLMENTS
// rows), totals computed in memory, one write. Caller must hold
// `lockDebt` for this debt.
export async function recomputeDebt(
  tx: Prisma.TransactionClient,
  debtId: string,
  today: string,
): Promise<void> {
  const installments = await tx.debtInstallment.findMany({
    where: { debtId },
    select: { status: true, amount: true, dueDate: true },
  });
  await tx.debt.update({
    where: { id: debtId },
    data: computeDebtTotals(installments, today),
  });
}

// Mirrors a linked transaction's new PAID/PENDING status onto its
// installment, then recomputes the parent debt. No-op for a transaction
// that isn't linked to any installment, or whose installment already
// has that status (so re-marking a paid transaction as paid doesn't
// overwrite the real payment date).
//
// Callers that write the transaction row in the same database
// transaction must call `lockLinkedDebt` BEFORE that write: DebtsService
// always locks the debt first and the transaction second, so taking them
// in the opposite order here could deadlock against a concurrent pay.
export async function syncInstallmentFromTransactionStatus(
  tx: Prisma.TransactionClient,
  transactionId: string,
  status: "PAID" | "PENDING",
  today: string,
): Promise<void> {
  // Re-locking a row this transaction already holds is a no-op.
  if (!(await lockLinkedDebt(tx, transactionId))) return;
  // Re-read under the lock — the status may have changed while waiting.
  const installment = await tx.debtInstallment.findUnique({
    where: { transactionId },
    select: { id: true, debtId: true, status: true },
  });
  if (!installment || installment.status === status) return;

  await tx.debtInstallment.update({
    where: { id: installment.id },
    // Legacy stamps CURRENT_DATE as the payment date on this path — the
    // transaction-status toggle carries no date of its own.
    data:
      status === "PAID"
        ? { status: "PAID", paymentDate: parseDateOnly(today) }
        : { status: "PENDING", paymentDate: null },
  });
  await recomputeDebt(tx, installment.debtId, today);
}
