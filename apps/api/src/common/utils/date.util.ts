// Centralizes every date-only (no time-of-day) parse/format/arithmetic
// operation in the API. Always explicit UTC — never relies on the
// server process's local timezone (`new Date(dateStr)` on a bare
// "YYYY-MM-DD" string IS spec-guaranteed to parse as UTC midnight, but
// being explicit here means nothing downstream can silently regress
// that by switching to a timestamp-bearing string or a locale-aware
// Date method).

// "2026-01-15" -> Date at 2026-01-15T00:00:00.000Z.
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// Date -> "2026-01-15", reading UTC fields explicitly (not local ones).
export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Mirrors legacy's `strtotime($data . " +N months")` — plain
// calendar-month arithmetic, including its day-of-month overflow
// behavior (e.g. Jan 31 + 1 month rolls into March), since that's what
// `funcoes_transacoes.php`'s recurring generation already does.
export function addMonthsToDateString(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1 + months, day));
  return toDateOnlyString(date);
}

// "Today" as a date-only string, read from UTC fields — same rationale
// as the rest of this file: never let server-local timezone leak in.
export function todayDateOnlyString(): string {
  return toDateOnlyString(new Date());
}

export function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnlyString(date);
}

// Inclusive day count between two date-only strings (dateTo - dateFrom + 1).
export function daysBetweenInclusive(dateFromStr: string, dateToStr: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDateOnly(dateToStr).getTime() - parseDateOnly(dateFromStr).getTime()) / msPerDay) + 1;
}

export function startOfMonthDateString(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  return toDateOnlyString(new Date(Date.UTC(year!, month! - 1, 1)));
}

export function endOfMonthDateString(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  return toDateOnlyString(new Date(Date.UTC(year!, month!, 0)));
}
