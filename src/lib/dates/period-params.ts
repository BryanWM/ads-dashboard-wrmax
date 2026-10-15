import {
  PERIOD_PRESETS,
  previousPeriod,
  rangeLength,
  resolvePreset,
  type DateRange,
  type PeriodPreset,
} from "./periods";

/**
 * The dashboard period lives in the URL so it can be shared and survives reloads:
 *   ?period=last_30d            preset
 *   ?period=custom&from=…&to=…  custom inclusive range
 *   &compare=0                  disable comparison (on by default)
 * Anything invalid falls back to the default preset — URL input is untrusted.
 */

export const DEFAULT_PRESET: PeriodPreset = "last_30d";
export const MAX_RANGE_DAYS = 366;

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  last_7d: "Últimos 7 dias",
  last_14d: "Últimos 14 dias",
  last_30d: "Últimos 30 dias",
  this_month: "Este mês",
  last_month: "Mês anterior",
};

/** Presets offered as chips in the overview header; anything else is the calendar. */
export const CHIP_PRESETS = ["last_7d", "last_30d", "this_month"] as const;
export type ChipPreset = (typeof CHIP_PRESETS)[number];

export function isChipPreset(preset: PeriodPreset | null): preset is ChipPreset {
  return (CHIP_PRESETS as readonly string[]).includes(preset ?? "");
}

export interface PeriodSelection {
  /** null for custom ranges (deduplicated reach is only stored for presets). */
  preset: PeriodPreset | null;
  range: DateRange;
  previous: DateRange;
  compare: boolean;
}

type Params = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isPreset(value: string | undefined): value is PeriodPreset {
  return (PERIOD_PRESETS as readonly string[]).includes(value ?? "");
}

function parseCustom(from: string | undefined, to: string | undefined, today: string) {
  if (!from || !to || !ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
  if (to > today) return null;
  try {
    const length = rangeLength({ from, to });
    return length <= MAX_RANGE_DAYS ? { from, to } : null;
  } catch {
    return null;
  }
}

export function parsePeriodSelection(params: Params, today: string): PeriodSelection {
  const period = single(params.period);
  const compare = single(params.compare) !== "0";

  if (period === "custom") {
    const range = parseCustom(single(params.from), single(params.to), today);
    if (range) return { preset: null, range, previous: previousPeriod(range), compare };
  }

  const preset = isPreset(period) ? period : DEFAULT_PRESET;
  const range = resolvePreset(preset, today);
  return { preset, range, previous: previousPeriod(range), compare };
}

/** Search params for a selection; keeps unrelated params (e.g. client) untouched. */
export function withPeriod(
  current: URLSearchParams,
  next: { preset: PeriodPreset } | { range: DateRange },
): URLSearchParams {
  const params = new URLSearchParams(current);
  params.delete("from");
  params.delete("to");
  if ("preset" in next) {
    params.set("period", next.preset);
  } else {
    params.set("period", "custom");
    params.set("from", next.range.from);
    params.set("to", next.range.to);
  }
  return params;
}
