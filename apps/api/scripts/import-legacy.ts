// One-off ETL: imports the legacy PHP app's MySQL dump
// (legacy_php_reference/u676707464_monitorizze.sql) into this repo's
// Postgres schema: usuarios -> User, categorias -> Category, transacoes
// -> Transaction, metas -> Goal, dividas -> Debt, dividas_parcelas ->
// DebtInstallment. The dump has no rows for grocery, vehicles,
// maintenance, subscriptions or changelog, so there's nothing to port
// there; codigos_recuperacao (short-lived reset codes) are left behind.
// See docs/specs/*/design.md for each table's column mapping.
//
// Usage:
//   pnpm --filter @mony/api run import:legacy -- --dry-run   (default, no writes)
//   pnpm --filter @mony/api run import:legacy -- --commit     (writes for real)
//
// Idempotency: NOT idempotent. Re-running --commit twice duplicates
// everything (there's no legacy-id column to upsert against — ids are
// regenerated as fresh UUIDs). Run --commit exactly once against a
// clean target database.
/* eslint-disable no-console -- CLI script, stdout output is the point */
import { readFileSync } from "fs";
import { join } from "path";

import { Prisma, PrismaClient } from "@prisma/client";

import { computeDebtTotals } from "../src/common/debt-sync/debt-sync";

const prisma = new PrismaClient();

const DUMP_PATH = join(__dirname, "../../../legacy_php_reference/u676707464_monitorizze.sql");
const DRY_RUN = !process.argv.includes("--commit");

// fa-* (Font Awesome, legacy) -> Ionicons key (CATEGORY_ICONS in
// packages/shared-types/src/category.ts). "" / "NULL" (legacy's literal
// unquoted NULL) fall back to the generic icon.
const ICON_MAP: Record<string, string> = {
  "": "ellipsis-horizontal-outline",
  NULL: "ellipsis-horizontal-outline",
  "fa-baby": "happy-outline",
  "fa-book": "book-outline",
  "fa-bus": "bus-outline",
  "fa-car": "car-outline",
  "fa-cash-register": "storefront-outline",
  "fa-chart-line": "trending-up-outline",
  "fa-coffee": "cafe-outline",
  "fa-coins": "cash-outline",
  "fa-credit-card": "card-outline",
  "fa-dollar-sign": "cash-outline",
  "fa-donate": "gift-outline",
  "fa-dumbbell": "barbell-outline",
  "fa-gamepad": "game-controller-outline",
  "fa-gift": "gift-outline",
  "fa-glass-cheers": "wine-outline",
  "fa-graduation-cap": "school-outline",
  "fa-hand-holding-usd": "cash-outline",
  "fa-heartbeat": "pulse-outline",
  "fa-home": "home-outline",
  "fa-laptop": "laptop-outline",
  "fa-lightbulb": "bulb-outline",
  "fa-mobile-alt": "phone-portrait-outline",
  "fa-money-bill-wave": "cash-outline",
  "fa-paw": "paw-outline",
  "fa-piggy-bank": "save-outline",
  "fa-pills": "medkit-outline",
  "fa-plane": "airplane-outline",
  "fa-shopping-bag": "bag-outline",
  "fa-taxi": "car-sport-outline",
  "fa-tools": "construct-outline",
  "fa-tshirt": "shirt-outline",
  "fa-user-md": "medkit-outline",
  "fa-utensils": "restaurant-outline",
  "fa-wallet": "wallet-outline",
};
const FALLBACK_ICON = "ellipsis-horizontal-outline";

function mapIcon(legacyIcon: string): string {
  return ICON_MAP[legacyIcon] ?? FALLBACK_ICON;
}

function mapWorkspace(perfil: string): "PERSONAL" | "BUSINESS" {
  return perfil === "empresarial" ? "BUSINESS" : "PERSONAL";
}

function mapCategoryType(tipo: string): "INCOME" | "EXPENSE" {
  return tipo === "receita" ? "INCOME" : "EXPENSE";
}

function mapTransactionType(tipo: string): "INCOME" | "EXPENSE" {
  return tipo === "receita" ? "INCOME" : "EXPENSE";
}

function mapStatus(status: string): "PAID" | "PENDING" {
  return status === "pendente" ? "PENDING" : "PAID";
}

// Legacy has one number with an accidental "55" DDI prefix
// (13 digits); our column is VARCHAR(11) (DDD + number, no country
// code). Strips a leading "55" when the digit count would otherwise
// overflow, then hard-truncates as a last resort so the row never
// fails to insert over a cosmetic field.
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

function nullIfEmpty(value: string | null): string | null {
  if (value === null || value === "NULL" || value === "") return null;
  return value;
}

function parseLegacyDate(value: string): Date {
  // Legacy dates are "YYYY-MM-DD" or "YYYY-MM-DD HH:MM:SS" — always
  // parsed as explicit UTC, same rationale as date.util.ts.
  const datePart = value.slice(0, 10);
  return new Date(`${datePart}T00:00:00.000Z`);
}

function parseLegacyDateTime(value: string): Date {
  return new Date(`${value.replace(" ", "T")}Z`);
}

// ---- dump parsing ----
// The legacy dump has no foreign-key-safe structure to query (it's a
// flat .sql file, not a live DB) — parsed directly rather than spun up
// in a throwaway MySQL instance just to run `SELECT * FROM x`.
// Every row of a table. phpMyAdmin splits big tables into several
// `INSERT INTO … VALUES` statements (chunks of rows), so ALL of them are
// read — reading only the first one silently dropped most of the data.
function extractInsertBlock(sql: string, table: string): string[] {
  const marker = `INSERT INTO \`${table}\``;
  const rows: string[] = [];
  let idx = sql.indexOf(marker);
  while (idx !== -1) {
    const endIdx = sql.indexOf(";\n", idx);
    const block = sql.slice(idx, endIdx);
    const rowsPart = block.slice(block.indexOf("VALUES") + 6);
    rows.push(
      ...rowsPart.split(/\),\s*\n?\(/).map((r) => r.trim().replace(/^\(/, "").replace(/\)$/, "")),
    );
    idx = sql.indexOf(marker, endIdx);
  }
  return rows;
}

function splitRow(row: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inStr = false;
  for (let i = 0; i < row.length; i++) {
    const c = row[i]!;
    if (inStr) {
      if (c === "\\") {
        cur += c + row[i + 1];
        i++;
        continue;
      }
      if (c === "'") {
        inStr = false;
        continue;
      }
      cur += c;
    } else {
      if (c === "'") {
        inStr = true;
        continue;
      }
      if (c === ",") {
        fields.push(cur.trim());
        cur = "";
        continue;
      }
      cur += c;
    }
  }
  fields.push(cur.trim());
  return fields;
}

interface Stats {
  users: number;
  categories: number;
  categoryCopiesForOwner: number;
  transactions: number;
  transactionsFallbackCategory: number;
  transactionsCategoryTypeMismatch: number;
  transactionsSkippedNoUser: number;
  linkedTransactionStatusAligned: number;
  goals: number;
  goalsSkippedNoUser: number;
  debts: number;
  debtsSkippedNoUser: number;
  debtsCategoryDropped: number;
  debtTotalsRecomputed: number;
  installments: number;
  installmentsLinked: number;
  installmentLinksDropped: number;
  fallbackCategoriesCreated: number;
}

interface LegacyCategory {
  userLegacyId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  color: string;
  icon: string;
}

async function main() {
  const sql = readFileSync(DUMP_PATH, "utf8");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "COMMIT (writing to the database)"}`);
  const today = new Date().toISOString().slice(0, 10);

  const stats: Stats = {
    users: 0,
    categories: 0,
    categoryCopiesForOwner: 0,
    transactions: 0,
    transactionsFallbackCategory: 0,
    transactionsCategoryTypeMismatch: 0,
    transactionsSkippedNoUser: 0,
    linkedTransactionStatusAligned: 0,
    goals: 0,
    goalsSkippedNoUser: 0,
    debts: 0,
    debtsSkippedNoUser: 0,
    debtsCategoryDropped: 0,
    debtTotalsRecomputed: 0,
    installments: 0,
    installmentsLinked: 0,
    installmentLinksDropped: 0,
    fallbackCategoriesCreated: 0,
  };

  const userIdMap = new Map<string, string>(); // legacy int id (string) -> new UUID
  const transactionIdMap = new Map<string, string>(); // legacy transacoes.id -> new UUID
  // (userId, type) -> fallback "Importado" category UUID, created lazily
  // for transactions whose legacy categoria_id doesn't resolve.
  const fallbackCategoryCache = new Map<string, string>();

  // ---- users ----
  const userRows = extractInsertBlock(sql, "usuarios").map(splitRow);
  for (const r of userRows) {
    const [
      legacyId,
      nome,
      email,
      telefone,
      telefone2,
      perfil,
      status,
      senha,
      dataCadastro,
      ultimoAcesso,
    ] = r;
    if (!email || !nome) {
      console.warn(`Skipping user id=${legacyId}: missing name or email.`);
      continue;
    }
    const data = {
      name: nome!.slice(0, 100),
      email: email!.slice(0, 100),
      phone: normalizePhone(nullIfEmpty(telefone!)),
      phone2: normalizePhone(nullIfEmpty(telefone2!)),
      // PHP password_hash() bcrypt ("$2y$…") — bcryptjs verifies it as is,
      // so everyone keeps their password.
      passwordHash: senha!,
      role: (perfil === "admin" ? "ADMIN" : "USER") as "ADMIN" | "USER",
      status: (status === "inativo" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
      activeWorkspace: "PERSONAL" as const,
      createdAt: parseLegacyDateTime(dataCadastro!),
      lastAccessAt:
        ultimoAcesso && ultimoAcesso !== "NULL" ? parseLegacyDateTime(ultimoAcesso) : null,
    };
    if (DRY_RUN) {
      userIdMap.set(legacyId!, `dry-run-user-${legacyId}`);
    } else {
      const created = await prisma.user.create({ data });
      userIdMap.set(legacyId!, created.id);
    }
    stats.users++;
  }

  // ---- categories ----
  // Legacy never checked that a record's category belonged to the same
  // user: some transactions and debts point at another account's category
  // (a shared default set). Each category is imported for its owner, and
  // a record referencing someone else's category gets its OWN copy of it
  // (same name, type, color, icon) — never a link across accounts.
  const legacyCategories = new Map<string, LegacyCategory>();
  // `${ownerLegacyUserId}:${legacyCategoryId}` -> new UUID
  const categoryIdMap = new Map<string, string>();

  const catRows = extractInsertBlock(sql, "categorias").map(splitRow);
  for (const r of catRows) {
    const [legacyId, usuarioId, nome, tipo, cor, icone] = r;
    const category: LegacyCategory = {
      userLegacyId: usuarioId!,
      name: (nome || "Sem nome").slice(0, 50),
      type: mapCategoryType(tipo!),
      color: /^#[0-9A-Fa-f]{6}$/.test(cor!) ? cor! : "#000000",
      icon: mapIcon(icone!),
    };
    legacyCategories.set(legacyId!, category);
    const newUserId = userIdMap.get(usuarioId!);
    if (!newUserId) {
      console.warn(`Skipping category id=${legacyId}: owning user ${usuarioId} not imported.`);
      continue;
    }
    categoryIdMap.set(`${usuarioId}:${legacyId}`, await createCategory(newUserId, category));
    stats.categories++;
  }

  async function createCategory(newUserId: string, category: LegacyCategory): Promise<string> {
    if (DRY_RUN) return `dry-run-category-${categoryIdMap.size}`;
    const created = await prisma.category.create({
      data: {
        userId: newUserId,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
      },
    });
    return created.id;
  }

  // The owner's category for a legacy category id — their own, or a copy
  // of someone else's. undefined when the legacy id doesn't exist.
  async function ownerCategory(
    ownerLegacyId: string,
    newUserId: string,
    legacyCategoryId: string,
  ): Promise<{ id: string; type: "INCOME" | "EXPENSE" } | undefined> {
    const category = legacyCategories.get(legacyCategoryId);
    if (!category) return undefined;
    const key = `${ownerLegacyId}:${legacyCategoryId}`;
    let id = categoryIdMap.get(key);
    if (!id) {
      id = await createCategory(newUserId, category);
      categoryIdMap.set(key, id);
      stats.categoryCopiesForOwner++;
    }
    return { id, type: category.type };
  }

  async function getOrCreateFallbackCategory(
    newUserId: string,
    type: "INCOME" | "EXPENSE",
  ): Promise<string> {
    const cacheKey = `${newUserId}:${type}`;
    const cached = fallbackCategoryCache.get(cacheKey);
    if (cached) return cached;
    if (DRY_RUN) {
      const id = `dry-run-fallback-${cacheKey}`;
      fallbackCategoryCache.set(cacheKey, id);
      stats.fallbackCategoriesCreated++;
      return id;
    }
    const created = await prisma.category.create({
      data: {
        userId: newUserId,
        name: "Importado",
        type,
        color: "#000000",
        icon: FALLBACK_ICON,
      },
    });
    fallbackCategoryCache.set(cacheKey, created.id);
    stats.fallbackCategoriesCreated++;
    return created.id;
  }

  // ---- installment ↔ transaction links (read before transactions) ----
  // In the app a linked transaction is PAID exactly when its installment
  // is (debt-sync). The installment is the debt's source of truth, so a
  // linked transaction takes its installment's status.
  const installmentRows = extractInsertBlock(sql, "dividas_parcelas").map(splitRow);
  const linkedStatusByLegacyTx = new Map<string, "PAID" | "PENDING">();
  for (const r of installmentRows) {
    const [, , , , , , transacaoId, status] = r;
    if (transacaoId && transacaoId !== "NULL" && !linkedStatusByLegacyTx.has(transacaoId)) {
      linkedStatusByLegacyTx.set(transacaoId, status === "pago" ? "PAID" : "PENDING");
    }
  }

  // ---- transactions ----
  const txRows = extractInsertBlock(sql, "transacoes").map(splitRow);
  for (const r of txRows) {
    const [
      legacyId,
      usuarioId,
      categoriaId,
      descricao,
      valor,
      dataTransacao,
      tipo,
      recorrente,
      dataCadastro,
      status,
      perfil,
    ] = r;
    const newUserId = userIdMap.get(usuarioId!);
    if (!newUserId) {
      stats.transactionsSkippedNoUser++;
      continue;
    }
    const type = mapTransactionType(tipo!);
    const category = await ownerCategory(usuarioId!, newUserId, categoriaId!);
    let newCategoryId: string;
    if (!category) {
      newCategoryId = await getOrCreateFallbackCategory(newUserId, type);
      stats.transactionsFallbackCategory++;
    } else {
      // Kept as legacy had it; the app only enforces the match when the
      // category is changed.
      if (category.type !== type) stats.transactionsCategoryTypeMismatch++;
      newCategoryId = category.id;
    }
    let txStatus = type === "INCOME" ? ("PAID" as const) : mapStatus(status!);
    const linkedStatus = linkedStatusByLegacyTx.get(legacyId!);
    if (linkedStatus && linkedStatus !== txStatus) {
      txStatus = linkedStatus;
      stats.linkedTransactionStatusAligned++;
    }
    const data = {
      userId: newUserId,
      categoryId: newCategoryId,
      workspace: mapWorkspace(perfil!),
      type,
      status: txStatus,
      description: (descricao || "Sem descrição").slice(0, 255),
      amount: new Prisma.Decimal(valor!),
      date: parseLegacyDate(dataTransacao!),
      recurring: recorrente === "1",
      createdAt: parseLegacyDateTime(dataCadastro!),
    };
    if (DRY_RUN) {
      transactionIdMap.set(legacyId!, `dry-run-tx-${legacyId}`);
    } else {
      const created = await prisma.transaction.create({ data });
      transactionIdMap.set(legacyId!, created.id);
    }
    stats.transactions++;
  }

  // ---- goals ----
  const goalRows = extractInsertBlock(sql, "metas").map(splitRow);
  for (const r of goalRows) {
    const [
      _legacyId,
      usuarioId,
      titulo,
      descricao,
      valorAlvo,
      valorAtual,
      dataInicio,
      dataFim,
      categoriaId,
      concluida,
      _dataCadastro,
      perfil,
    ] = r;
    const newUserId = userIdMap.get(usuarioId!);
    if (!newUserId) {
      stats.goalsSkippedNoUser++;
      continue;
    }
    const category =
      categoriaId !== "NULL" ? await ownerCategory(usuarioId!, newUserId, categoriaId!) : undefined;
    const data = {
      userId: newUserId,
      workspace: mapWorkspace(perfil!),
      categoryId: category?.id ?? null,
      title: (titulo || "Meta importada").slice(0, 100),
      description: nullIfEmpty(descricao!)?.slice(0, 500) ?? null,
      targetAmount: new Prisma.Decimal(valorAlvo!),
      currentAmount: new Prisma.Decimal(valorAtual!),
      targetDate: dataFim !== "NULL" ? parseLegacyDate(dataFim!) : null,
      completed: concluida === "1",
      // Per the product decision for this import: data_inicio (goal
      // start date) has no equivalent column in our Goal model, so it's
      // preserved as createdAt rather than defaulting to the import's
      // run date.
      createdAt: parseLegacyDate(dataInicio!),
    };
    if (!DRY_RUN) {
      await prisma.goal.create({ data });
    }
    stats.goals++;
  }

  // ---- debts + installments ----
  // dividas_parcelas grouped by debt; each debt and its installments are
  // written in one transaction. paidAmount / paidInstallments / status are
  // recomputed from the installments with the app's own rule
  // (computeDebtTotals), so imported debts behave exactly like new ones.
  const installmentsByDebt = new Map<string, string[][]>();
  for (const r of installmentRows) {
    const list = installmentsByDebt.get(r[1]!) ?? [];
    list.push(r);
    installmentsByDebt.set(r[1]!, list);
  }
  const usedTransactionIds = new Set<string>();

  const debtRows = extractInsertBlock(sql, "dividas").map(splitRow);
  for (const r of debtRows) {
    const [
      legacyId,
      usuarioId,
      nome,
      valorTotal,
      valorPago,
      dataInicio,
      dataFinal,
      taxaJuros,
      totalParcelas,
      parcelasPagas,
      categoriaId,
      observacoes,
      status,
      dataCriacao,
      ,
      perfil,
    ] = r;
    const newUserId = userIdMap.get(usuarioId!);
    if (!newUserId) {
      stats.debtsSkippedNoUser++;
      continue;
    }
    let categoryId: string | null = null;
    if (categoriaId && categoriaId !== "NULL") {
      const category = await ownerCategory(usuarioId!, newUserId, categoriaId);
      // Debts only take expense categories in the app.
      if (category?.type === "EXPENSE") categoryId = category.id;
      else stats.debtsCategoryDropped++;
    }

    const installments = (installmentsByDebt.get(legacyId!) ?? [])
      .map((i) => {
        const [, , numeroParcela, valor, dataVencimento, dataPagamento, transacaoId, iStatus] = i;
        let transactionId: string | null = null;
        if (transacaoId && transacaoId !== "NULL") {
          const mapped = transactionIdMap.get(transacaoId);
          // One installment per transaction (unique in the schema).
          if (mapped && !usedTransactionIds.has(mapped)) {
            transactionId = mapped;
            usedTransactionIds.add(mapped);
            stats.installmentsLinked++;
          } else {
            stats.installmentLinksDropped++;
          }
        }
        return {
          installmentNo: Number(numeroParcela),
          amount: new Prisma.Decimal(valor!),
          dueDate: parseLegacyDate(dataVencimento!),
          // "atrasado" isn't stored: overdue is derived from the due date.
          status: (iStatus === "pago" ? "PAID" : "PENDING") as "PAID" | "PENDING",
          paymentDate:
            dataPagamento && dataPagamento !== "NULL" ? parseLegacyDate(dataPagamento) : null,
          transactionId,
        };
      })
      .sort((a, b) => a.installmentNo - b.installmentNo);

    const totals = computeDebtTotals(installments, today);
    const legacyStatus =
      status === "quitada" ? "PAID_OFF" : status === "atrasada" ? "OVERDUE" : "ACTIVE";
    if (
      !totals.paidAmount.equals(new Prisma.Decimal(valorPago === "NULL" ? 0 : valorPago!)) ||
      totals.paidInstallments !== Number(parcelasPagas) ||
      totals.status !== legacyStatus
    ) {
      stats.debtTotalsRecomputed++;
    }

    const interest = taxaJuros && taxaJuros !== "NULL" ? new Prisma.Decimal(taxaJuros) : null;
    const data = {
      userId: newUserId,
      workspace: mapWorkspace(perfil!),
      categoryId,
      name: (nome || "Dívida importada").slice(0, 100),
      totalAmount: new Prisma.Decimal(valorTotal!),
      paidAmount: totals.paidAmount,
      startDate: parseLegacyDate(dataInicio!),
      endDate: dataFinal && dataFinal !== "NULL" ? parseLegacyDate(dataFinal) : null,
      // Legacy's default 0.00 means "not informed".
      interestRate: interest && !interest.isZero() ? interest : null,
      totalInstallments:
        totalParcelas && totalParcelas !== "NULL" ? Number(totalParcelas) : installments.length,
      paidInstallments: totals.paidInstallments,
      notes: nullIfEmpty(observacoes!)?.slice(0, 500) ?? null,
      status: totals.status,
      createdAt: parseLegacyDateTime(dataCriacao!),
    };
    if (!DRY_RUN) {
      await prisma.$transaction(async (tx) => {
        const debt = await tx.debt.create({ data });
        if (installments.length > 0) {
          await tx.debtInstallment.createMany({
            data: installments.map((installment) => ({ ...installment, debtId: debt.id })),
          });
        }
      });
    }
    stats.debts++;
    stats.installments += installments.length;
  }

  console.log("\n--- Import summary ---");
  console.log(stats);
  if (DRY_RUN) {
    console.log("\nDry run only — no rows were written. Re-run with --commit to write for real.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
