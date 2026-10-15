/**
 * Calendar widgets work with local Date objects; our periods are calendar strings
 * ("2026-10-14"). These two keep the day stable regardless of the browser timezone.
 */
export function isoToLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function localDateToIso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}
