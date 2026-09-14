/**
 * 見積・請求の金額計算。
 *
 * DBにもサーバー機能にも依存しない純粋な計算なので、ここに分けてテストできるようにしている
 * （金額の計算誤りは請求書の誤りに直結するため）。
 */

export type SummarizableItem = {
  quantity: number;
  unitPrice: number;
  /** 明細ごとの消費税率（%）。軽減税率や非課税の品目が混ざっても正しく計算するため */
  taxRate: number;
};

export type QuoteSummary = {
  quantity: number;
  subtotal: number;
  tax: number;
  total: number;
  /** 税率ごとの内訳。帳票の区分記載に使う */
  taxes: { rate: number; base: number; tax: number }[];
};

/**
 * 明細項目から合計を計算する（税抜合計・消費税額・税込合計・数量）。保存はせず都度計算する。
 *
 * 消費税は**税率ごとに税抜小計を積み上げてから1回だけ端数処理する**。
 * 明細1行ずつ丸めて足すと、行数が増えるほど正しい税額からずれていくため
 * （元のFileMaker側は行ごとに丸めており、数量が2以上のときに合計が合わなくなっていた）。
 */
export function summarizeItems(items: SummarizableItem[]): QuoteSummary {
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  const baseByRate = new Map<number, number>();
  for (const item of items) {
    const current = baseByRate.get(item.taxRate) ?? 0;
    baseByRate.set(item.taxRate, current + item.quantity * item.unitPrice);
  }

  const taxes = [...baseByRate.entries()]
    .sort(([a], [b]) => a - b)
    .map(([rate, base]) => ({
      rate,
      base,
      tax: Math.round(base * (rate / 100)),
    }));

  const tax = taxes.reduce((sum, row) => sum + row.tax, 0);
  return { quantity, subtotal, tax, total: subtotal + tax, taxes };
}
