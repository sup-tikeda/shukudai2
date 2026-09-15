import { describe, expect, it } from "vitest";
import { summarizeItems } from "~/lib/quote-summary";

describe("summarizeItems", () => {
  it("明細が無いときは全て0になる", () => {
    expect(summarizeItems([])).toEqual({
      quantity: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      taxes: [],
    });
  });

  it("数量×単価を積み上げ、税率ごとに課税する", () => {
    const summary = summarizeItems([
      { quantity: 2, unitPrice: 1000, taxRate: 10 },
      { quantity: 1, unitPrice: 3000, taxRate: 10 },
    ]);

    expect(summary.quantity).toBe(3);
    expect(summary.subtotal).toBe(5000);
    expect(summary.tax).toBe(500);
    expect(summary.total).toBe(5500);
  });

  it("税抜合計と消費税額の合計が、必ず税込合計と一致する", () => {
    // 行ごとに端数処理すると合わなくなるため、税率単位でまとめてから丸めている
    const summary = summarizeItems([
      { quantity: 3, unitPrice: 333, taxRate: 10 },
      { quantity: 7, unitPrice: 111, taxRate: 10 },
    ]);

    expect(summary.subtotal + summary.tax).toBe(summary.total);
  });

  it("税率が混在する場合は税率ごとに内訳を返す", () => {
    const summary = summarizeItems([
      { quantity: 1, unitPrice: 10000, taxRate: 10 },
      { quantity: 1, unitPrice: 5000, taxRate: 8 },
      // 自賠責保険料など、消費税がかからない品目
      { quantity: 1, unitPrice: 9000, taxRate: 0 },
    ]);

    expect(summary.subtotal).toBe(24000);
    // 税率の小さい順に並ぶ
    expect(summary.taxes).toEqual([
      { rate: 0, base: 9000, tax: 0 },
      { rate: 8, base: 5000, tax: 400 },
      { rate: 10, base: 10000, tax: 1000 },
    ]);
    expect(summary.tax).toBe(1400);
    expect(summary.total).toBe(25400);
  });

  it("端数は税率ごとに1回だけ丸める", () => {
    // 105円の10%は10.5円。行ごとに丸めると 11+11=22 になるが、
    // まとめてから丸めるので 210円の10%＝21円になる
    const summary = summarizeItems([
      { quantity: 1, unitPrice: 105, taxRate: 10 },
      { quantity: 1, unitPrice: 105, taxRate: 10 },
    ]);

    expect(summary.tax).toBe(21);
  });

  it("割引の明細（単価がマイナス）は合計から差し引かれる", () => {
    const summary = summarizeItems([
      { quantity: 1, unitPrice: 10000, taxRate: 10 },
      // 作業マスタで種別「割引」を選んだ明細は、単価がマイナスで入る
      { quantity: 1, unitPrice: -1000, taxRate: 10 },
    ]);

    expect(summary.subtotal).toBe(9000);
    expect(summary.tax).toBe(900);
    expect(summary.total).toBe(9900);
  });

  it("割引だけの税率でも、プラスのときと同じ丸め方になる", () => {
    // -105円の10%は-10.5円。Math.round のままだと0方向に寄って-10円になってしまう
    const summary = summarizeItems([
      { quantity: 1, unitPrice: -105, taxRate: 10 },
    ]);

    expect(summary.subtotal).toBe(-105);
    expect(summary.tax).toBe(-11);
    expect(summary.total).toBe(-116);
  });
});
