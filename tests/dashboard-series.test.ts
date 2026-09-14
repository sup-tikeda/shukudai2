import { describe, expect, it } from "vitest";
import { fillMonthlySeries } from "~/lib/dashboard-series";

describe("fillMonthlySeries", () => {
  it("売上が無い月を0で埋めて、指定した月数の系列にする", () => {
    const points = fillMonthlySeries(
      [{ month: "2026-09", value: 68200 }],
      "2026-09",
      3,
    );

    expect(points).toEqual([
      { month: "2026-07", label: "7月", value: 0 },
      { month: "2026-08", label: "8月", value: 0 },
      { month: "2026-09", label: "9月", value: 68200 },
    ]);
  });

  it("年をまたいでも正しい月になる", () => {
    const points = fillMonthlySeries([], "2026-02", 4);

    expect(points.map((p) => p.month)).toEqual([
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
    ]);
    expect(points.map((p) => p.label)).toEqual([
      "11月",
      "12月",
      "1月",
      "2月",
    ]);
  });

  it("範囲外の月は無視する", () => {
    const points = fillMonthlySeries(
      [
        { month: "2026-01", value: 100 },
        { month: "2026-09", value: 999 },
      ],
      "2026-02",
      2,
    );

    expect(points).toEqual([
      { month: "2026-01", label: "1月", value: 100 },
      { month: "2026-02", label: "2月", value: 0 },
    ]);
  });
});
