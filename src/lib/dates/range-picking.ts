/**
 * Custom period in the calendar, in the order the agency asked for: the FIRST tap sets
 * the end date, the SECOND tap sets the start date; then it starts over. A start tapped
 * after the end swaps them, so the range is always valid.
 */
export type PickStep = "end" | "start";

export interface PickedRange {
  from: Date;
  to: Date;
}

export function pickDay(
  current: { from?: Date; to?: Date } | undefined,
  day: Date,
  step: PickStep,
): { range: PickedRange; next: PickStep } {
  if (step === "end") {
    // Keep the current start when it is still before the new end.
    const from = current?.from && current.from.getTime() <= day.getTime() ? current.from : day;
    return { range: { from, to: day }, next: "start" };
  }
  const end = current?.to ?? day;
  return {
    range: day.getTime() <= end.getTime() ? { from: day, to: end } : { from: end, to: day },
    next: "end",
  };
}
