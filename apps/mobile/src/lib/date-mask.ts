// Displays as DD/MM/AAAA (pt-BR convention) — the form's underlying
// value stays ISO (YYYY-MM-DD), matching what the API/zod schema expect.
export function formatDateDisplay(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

export function formatDateInputDigits(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Returns "" while the date is still incomplete, so the ISO-backed form
// field naturally fails its "Data é obrigatória" check until all 8
// digits are typed.
export function parseDateInputToISO(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return "";
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
}

// The device's local calendar date as ISO — for defaulting a date field
// to "today" the way the user reads their own calendar (a UTC date would
// already be tomorrow after 21:00 in Brazil).
export function localTodayISO(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
