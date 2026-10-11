import { describe, expect, it } from "vitest";

import {
  formatCalendarDate,
  formatDateRange,
  formatDateTime,
  formatMetricValue,
  formatPercentChange,
  MISSING,
} from "@/lib/format";

// Intl uses non-breaking spaces between currency symbol and value.
const normalize = (s: string) => s.replace(/ | /g, " ");

describe("formatMetricValue", () => {
  it("renders missing values as a dash, never zero", () => {
    expect(formatMetricValue(null, "integer")).toBe(MISSING);
    expect(formatMetricValue(Number.NaN, "currency", { currency: "BRL" })).toBe(MISSING);
  });

  it("formats currency in the account currency", () => {
    expect(normalize(formatMetricValue(1234.5, "currency", { currency: "BRL" }))).toBe(
      "R$ 1.234,50",
    );
    expect(normalize(formatMetricValue(10, "currency", { currency: "USD" }))).toBe("US$ 10,00");
  });

  it("requires a currency for monetary values", () => {
    expect(() => formatMetricValue(1, "currency")).toThrow();
  });

  it("formats integers, decimals and percents in pt-BR with at most one decimal", () => {
    expect(formatMetricValue(1284, "integer")).toBe("1.284");
    expect(formatMetricValue(1284.6, "integer")).toBe("1.285");
    expect(formatMetricValue(2.5, "decimal")).toBe("2,5");
    expect(normalize(formatMetricValue(1.8181, "percent"))).toBe("1,8%");
    expect(normalize(formatMetricValue(12.34, "percent"))).toBe("12,3%");
  });

  it("formats return on ad spend as a multiplier", () => {
    expect(formatMetricValue(4.237, "multiplier")).toBe("4,2x");
    expect(formatMetricValue(null, "multiplier")).toBe(MISSING);
  });

  it("abbreviates when compact", () => {
    expect(normalize(formatMetricValue(12_900, "integer", { compact: true }))).toBe("12,9 mil");
  });
});

describe("date formatting", () => {
  it("renders instants in the account timezone", () => {
    expect(formatDateTime("2026-10-10T09:12:00Z", "America/Sao_Paulo")).toBe("10/10/2026, 06:12");
    expect(formatDateTime(null, "UTC")).toBe(MISSING);
  });

  it("renders calendar dates without shifting the day", () => {
    expect(formatCalendarDate("2026-10-09")).toBe("09/10/2026");
  });

  it("compacts ranges within the same year", () => {
    expect(formatDateRange({ from: "2026-09-01", to: "2026-09-15" })).toBe("01/09 – 15/09/2026");
    expect(formatDateRange({ from: "2025-12-20", to: "2026-01-05" })).toBe(
      "20/12/2025 – 05/01/2026",
    );
  });
});

describe("formatPercentChange", () => {
  it("signs changes with a true minus", () => {
    expect(formatPercentChange(12.34)).toBe("+12,3%");
    expect(formatPercentChange(-4.06)).toBe("−4,1%");
  });

  it("handles zero and missing", () => {
    expect(formatPercentChange(0.01)).toBe("0,0%");
    expect(formatPercentChange(null)).toBe(MISSING);
  });
});
