import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AreaChart, DonutChart } from "~/components/ui/chart";

describe("グラフ部品のレンダリング", () => {
  it("AreaChart: 通常データ", () => {
    const html = renderToStaticMarkup(
      <AreaChart points={[
        { label: "4月", value: 0 },
        { label: "5月", value: 0 },
        { label: "6月", value: 0 },
        { label: "7月", value: 58300 },
        { label: "8月", value: 9900 },
        { label: "9月", value: 0 },
      ]} />,
    );
    expect(html).toContain("<svg");
    expect(html).toContain("9月");
  });

  it("AreaChart: 全て0でも壊れない", () => {
    const html = renderToStaticMarkup(
      <AreaChart points={[{ label: "9月", value: 0 }]} />,
    );
    expect(html).toContain("<svg");
  });

  it("AreaChart: 空配列でも壊れない", () => {
    const html = renderToStaticMarkup(<AreaChart points={[]} />);
    expect(html).toContain("<svg");
  });

  it("DonutChart: 通常データ", () => {
    const html = renderToStaticMarkup(
      <DonutChart
        centerValue="38%"
        centerLabel="完了"
        segments={[
          { label: "未作業", value: 3, color: "var(--color-ink-faint)" },
          { label: "作業中", value: 2, color: "var(--color-accent)" },
          { label: "完了済み", value: 3, color: "var(--color-success)" },
        ]}
      />,
    );
    expect(html).toContain("38%");
  });

  it("DonutChart: 全て0でも壊れない", () => {
    const html = renderToStaticMarkup(
      <DonutChart
        centerValue="0%"
        centerLabel="完了"
        segments={[{ label: "未作業", value: 0, color: "var(--color-ink-faint)" }]}
      />,
    );
    expect(html).toContain("0%");
  });
});
