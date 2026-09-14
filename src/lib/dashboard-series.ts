/**
 * ダッシュボードのグラフに渡す系列データの整形。
 *
 * DBにもサーバー機能にも依存しない純粋な処理なのでここに分け、テストできるようにしている。
 */

/** 売上グラフに出す月数（当月を含む） */
export const MONTHLY_REVENUE_MONTHS = 6;

export type MonthlyPoint = {
  /** "2026-09" 形式。並べ替えと突き合わせに使う */
  month: string;
  /** グラフの横軸に出す短いラベル */
  label: string;
  value: number;
};

/**
 * 月別の集計結果を、売上が無かった月も含めた連続した系列にする。
 *
 * DBは売上のあった月しか返さないため、そのまま折れ線にすると
 * 空白の月が詰められて「毎月売上がある」ように見えてしまう。
 *
 * @param rows DBから返った月別の集計（"YYYY-MM" と金額）
 * @param endMonth 系列の右端にする月（"YYYY-MM"）。通常は当月
 */
export function fillMonthlySeries(
  rows: { month: string; value: number }[],
  endMonth: string,
  months = MONTHLY_REVENUE_MONTHS,
): MonthlyPoint[] {
  const byMonth = new Map(rows.map((row) => [row.month, row.value]));
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);

  const points: MonthlyPoint[] = [];
  for (let back = months - 1; back >= 0; back--) {
    // Dateの月は0始まりなので、-1してから戻し、年またぎはDate側に計算させる
    const date = new Date(Date.UTC(endYear, endMonthNumber - 1 - back, 1));
    const year = date.getUTCFullYear();
    const monthNumber = date.getUTCMonth() + 1;
    const month = `${year}-${String(monthNumber).padStart(2, "0")}`;

    points.push({
      month,
      label: `${monthNumber}月`,
      value: byMonth.get(month) ?? 0,
    });
  }
  return points;
}
