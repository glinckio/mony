// One-off ETL: imports the legacy PHP app's MySQL dump
// (legacy_php_reference/u676707464_monitorizze.sql) into this repo's
// Postgres schema, for the tables the rebuilt app actually covers so
// far: usuarios -> User, categorias -> Category, transacoes ->
// Transaction, metas -> Goal. Debts/vehicles/subscriptions/grocery
// aren't ported here — those features don't exist yet.
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
function extractInsertBlock(sql: string, table: string): string[] {
  const marker = `INSERT INTO \`${table}\``;
  const idx = sql.indexOf(marker);
  if (idx === -1) return [];
  const endIdx = sql.indexOf(";\n", idx);
  const block = sql.slice(idx, endIdx);
  const rowsPart = block.slice(block.indexOf("VALUES") + 6);
  return rowsPart
    .split(/\),\s*\n?\(/)
    .map((r) => r.trim().replace(/^\(/, "").replace(/\)$/, ""));
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
  transactions: number;
  transactionsFallbackCategory: number;
  transactionsSkippedNoUser: number;
  goals: number;
  goalsSkippedNoUser: number;
  fallbackCategoriesCreated: number;
}

async function main() {
  const sql = readFileSync(DUMP_PATH, "utf8");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no writes)" : "COMMIT (writing to the database)"}`);

  const stats: Stats = {
    users: 0,
    categories: 0,
    transactions: 0,
    transactionsFallbackCategory: 0,
    transactionsSkippedNoUser: 0,
    goals: 0,
    goalsSkippedNoUser: 0,
    fallbackCategoriesCreated: 0,
  };

  const userIdMap = new Map<string, string>(); // legacy int id (string) -> new UUID
  const categoryIdMap = new Map<string, string>(); // legacy int id (string) -> new UUID
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
      passwordHash: senha!,
      role: (perfil === "admin" ? "ADMIN" : "USER") as "ADMIN" | "USER",
      status: (status === "inativo" ? "INACTIVE" : "ACTIVE") as "ACTIVE" | "INACTIVE",
      activeWorkspace: "PERSONAL" as const,
      createdAt: parseLegacyDateTime(dataCadastro!),
      lastAccessAt: ultimoAcesso && ultimoAcesso !== "NULL" ? parseLegacyDateTime(ultimoAcesso) : null,
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
  const catRows = extractInsertBlock(sql, "categorias").map(splitRow);
  for (const r of catRows) {
    const [legacyId, usuarioId, nome, tipo, cor, icone] = r;
    const newUserId = userIdMap.get(usuarioId!);
    if (!newUserId) {
      console.warn(`Skipping category id=${legacyId}: owning user ${usuarioId} not imported.`);
      continue;
    }

    const data = {
      userId: newUserId,
      name: (nome || "Sem nome").slice(0, 50),
      type: mapCategoryType(tipo!),
      color: /^#[0-9A-Fa-f]{6}$/.test(cor!) ? cor! : "#000000",
      icon: mapIcon(icone!),
    };

    if (DRY_RUN) {
      categoryIdMap.set(legacyId!, `dry-run-category-${legacyId}`);
    } else {
      const created = await prisma.category.create({ data });
      categoryIdMap.set(legacyId!, created.id);
    }
    stats.categories++;
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

  // ---- transactions ----
  const txRows = extractInsertBlock(sql, "transacoes").map(splitRow);
  for (const r of txRows) {
    const [
      _legacyId,
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
    let newCategoryId = categoryIdMap.get(categoriaId!);
    if (!newCategoryId) {
      newCategoryId = await getOrCreateFallbackCategory(newUserId, type);
      stats.transactionsFallbackCategory++;
    }

    const data = {
      userId: newUserId,
      categoryId: newCategoryId,
      workspace: mapWorkspace(perfil!),
      type,
      status: type === "INCOME" ? ("PAID" as const) : mapStatus(status!),
      description: (descricao || "Sem descrição").slice(0, 255),
      amount: new Prisma.Decimal(valor!),
      date: parseLegacyDate(dataTransacao!),
      recurring: recorrente === "1",
      createdAt: parseLegacyDateTime(dataCadastro!),
    };

    if (!DRY_RUN) {
      await prisma.transaction.create({ data });
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

    const newCategoryId = categoriaId !== "NULL" ? categoryIdMap.get(categoriaId!) : undefined;

    const data = {
      userId: newUserId,
      workspace: mapWorkspace(perfil!),
      categoryId: newCategoryId ?? null,
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
