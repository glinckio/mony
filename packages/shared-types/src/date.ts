const DATE_ONLY_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

// True for a real calendar date in "YYYY-MM-DD" form — rejects shapes
// that parse but don't exist (e.g. "2026-02-31"), which the API's strict
// `@IsDateString` would otherwise turn into an opaque 400 after submit.
export function isCalendarDate(value: string): boolean {
  const match = DATE_ONLY_REGEX.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
  );
}
