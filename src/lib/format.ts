import type { MetricFormat } from "@/lib/metrics/definitions";

export const LOCALE = "pt-BR";

/** Shown wherever a value is missing. Never render missing data as "0". */
export const MISSING = "—";

export interface FormatOptions {
  /** ISO 4217 code of the ad account, required for currency values. */
  currency?: string;
  /** Abbreviate large numbers (12,9 mil · 4,2 mi). */
  compact?: boolean;
}

const cache = new Map<string, Intl.NumberFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let fmt = cache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE, options);
    cache.set(key, fmt);
  }
  return fmt;
}

export function formatMetricValue(
  value: number | null,
  format: MetricFormat,
  { currency, compact = false }: FormatOptions = {},
): string {
  if (value === null || !Number.isFinite(value)) return MISSING;

  const notation = compact ? "compact" : "standard";
  switch (format) {
    case "currency":
      if (!currency) throw new Error("formatMetricValue: currency is required for currency values");
      return numberFormat({
        style: "currency",
        currency,
        notation,
        maximumFractionDigits: compact ? 1 : 2,
        minimumFractionDigits: compact ? 0 : 2,
      }).format(value);
    case "integer":
      return numberFormat({ notation, maximumFractionDigits: compact ? 1 : 0 }).format(value);
    // Brief: at most one decimal place in rates and percentages.
    case "decimal":
      return numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
    case "percent":
      // Values are already in percent units (1.82 → "1,8%").
      return numberFormat({
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100);
    case "multiplier":
      // ROAS: 4.237 → "4,2x"
      return `${numberFormat({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}x`;
  }
}

const dateTimeCache = new Map<string, Intl.DateTimeFormat>();

function dateTimeFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let fmt = dateTimeCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(LOCALE, options);
    dateTimeCache.set(key, fmt);
  }
  return fmt;
}

/**
 * An instant shown in an explicit timezone (the account's), so server-rendered
 * text never depends on where the server runs. "10/10/2026, 06:12".
 */
export function formatDateTime(iso: string | null, timeZone: string): string {
  if (!iso) return MISSING;
  return dateTimeFormat({ dateStyle: "short", timeStyle: "short", timeZone }).format(new Date(iso));
}

/** A calendar date ("YYYY-MM-DD") as "09/10/2026" — no timezone shift. */
export function formatCalendarDate(
  date: string | null,
  style: "short" | "medium" = "short",
): string {
  if (!date) return MISSING;
  return dateTimeFormat({ dateStyle: style, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/** "01/09 – 15/09/2026" */
export function formatDateRange(range: { from: string; to: string }): string {
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  const from = sameYear
    ? dateTimeFormat({ day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(
        new Date(`${range.from}T00:00:00Z`),
      )
    : formatCalendarDate(range.from);
  return `${from} – ${formatCalendarDate(range.to)}`;
}

/** Signed relative change, e.g. "+12,3%" / "−4,1%". Uses a true minus sign. */
export function formatPercentChange(change: number | null): string {
  if (change === null || !Number.isFinite(change)) return MISSING;
  const abs = numberFormat({ maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(
    Math.abs(change),
  );
  if (abs === "0,0") return "0,0%";
  return `${change > 0 ? "+" : "−"}${abs}%`;
}
