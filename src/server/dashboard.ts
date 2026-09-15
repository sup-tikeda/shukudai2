import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, isNotNull, lte, sql } from "drizzle-orm";
import { cases, customers, quoteItems, quotes, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import {
  fillMonthlySeries,
  MONTHLY_REVENUE_MONTHS,
} from "~/lib/dashboard-series";
import { requireSession } from "~/server/authGuard";

/** 車検期限を「何日先まで」知らせるか。案内を出してから入庫までの準備期間として2か月みておく */
const INSPECTION_ALERT_DAYS = 60;

/**
 * 車検期限の判定に使う「今日から何日先まで」を、DB側の現在日付を基準に組み立てる。
 *
 * パラメータの型を明示しないと、Postgresが date + 整数 の演算子を一意に決められず
 * エラーになる（"operator is not unique: date + unknown"）ため、::int で明示的にキャストする。
 */
function inspectionAlertLimit() {
  return sql`current_date + ${INSPECTION_ALERT_DAYS}::int`;
}

/**
 * 種別（見積書／請求書）ごとの税込合計を出すSQL。
 *
 * 消費税は**書類ごと・税率ごとに税抜小計をまとめてから1回だけ丸める**。
 * 明細1行ずつ丸めて足すと帳票の金額とずれてしまうため、
 * [quote-summary.ts](src/lib/quote-summary.ts) の計算と同じ手順にしている。
 */
function taxIncludedTotalSql(docType: "見積書" | "請求書") {
  return sql<{ value: number }>`
    select coalesce(sum(t.base + round(t.base * t.rate / 100)), 0)::int as value
    from (
      select ${quoteItems.taxRate} as rate,
             sum(${quoteItems.quantity} * ${quoteItems.unitPrice}) as base
      from ${quoteItems}
      join ${quotes} on ${quotes.id} = ${quoteItems.quoteId}
      where ${quotes.docType} = ${docType}
      group by ${quoteItems.quoteId}, ${quoteItems.taxRate}
    ) t
  `;
}

/** ダッシュボードに出す件数と金額。画面を開いた時点の状況を一目で掴むためのもの。 */
export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const [
      [customerCount],
      [vehicleCount],
      [openCaseCount],
      [inspectionAlertCount],
      invoiceTotalRows,
      quoteTotalRows,
    ] = await Promise.all([
      db.select({ value: count() }).from(customers),
      db.select({ value: count() }).from(vehicles),
      // 「対応が必要な案件」として、完了済み以外を数える
      db
        .select({ value: count() })
        .from(cases)
        .where(sql`${cases.status} <> '完了済み'`),
      // 車検期限が近い（期限切れを含む）車両の台数
      db
        .select({ value: count() })
        .from(vehicles)
        .where(
          and(
            isNotNull(vehicles.inspectionExpiresOn),
            lte(vehicles.inspectionExpiresOn, inspectionAlertLimit()),
          ),
        ),
      db.execute(taxIncludedTotalSql("請求書")),
      db.execute(taxIncludedTotalSql("見積書")),
    ]);

    return {
      customers: customerCount.value,
      vehicles: vehicleCount.value,
      openCases: openCaseCount.value,
      inspectionAlertCount: inspectionAlertCount.value,
      // 画面の説明文で「何日以内か」を出すため、判定に使った日数もそのまま返す
      // （画面側に同じ数字を書くと、こちらを変えた時に食い違うため）
      inspectionAlertDays: INSPECTION_ALERT_DAYS,
      invoiceTotal: Number(invoiceTotalRows[0]?.value ?? 0),
      quoteTotal: Number(quoteTotalRows[0]?.value ?? 0),
    };
  },
);

/**
 * 月別の請求金額（直近6か月）。売上の伸び縮みをグラフで見るためのもの。
 * 集計の基準日は発行日（`created_on`）。
 */
export const getMonthlyRevenue = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const rows = await db.execute(sql<{ month: string; value: number }>`
      select to_char(t.created_on, 'YYYY-MM') as month,
             coalesce(sum(t.base + round(t.base * t.rate / 100)), 0)::int as value
      from (
        select ${quotes.id} as quote_id,
               date_trunc('month', ${quotes.createdOn}) as created_on,
               ${quoteItems.taxRate} as rate,
               sum(${quoteItems.quantity} * ${quoteItems.unitPrice}) as base
        from ${quoteItems}
        join ${quotes} on ${quotes.id} = ${quoteItems.quoteId}
        where ${quotes.docType} = '請求書'
          and ${quotes.createdOn} >= date_trunc('month', current_date)
              - make_interval(months => ${MONTHLY_REVENUE_MONTHS - 1}::int)
        group by ${quotes.id}, ${quotes.createdOn}, ${quoteItems.taxRate}
      ) t
      group by 1
      order by 1
    `);

    // 「今月」もDB側の日付で決める（サーバーとDBで月がずれないようにするため）
    const [currentMonthRow] = await db.execute(sql<{ month: string }>`
      select to_char(current_date, 'YYYY-MM') as month
    `);

    return fillMonthlySeries(
      rows.map((row) => ({
        month: String(row.month),
        value: Number(row.value),
      })),
      String(currentMonthRow.month),
    );
  },
);

/** 案件のステータス内訳。滞留（未作業ばかり溜まっていないか）に気づくためのもの。 */
export const getCaseStatusCounts = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const rows = await db
      .select({ status: cases.status, value: count() })
      .from(cases)
      .groupBy(cases.status);

    const byStatus = new Map(rows.map((row) => [row.status, row.value]));
    return {
      未作業: byStatus.get("未作業") ?? 0,
      作業中: byStatus.get("作業中") ?? 0,
      完了済み: byStatus.get("完了済み") ?? 0,
    };
  },
);

/**
 * 車検期限が近い車両（期限切れを含む）。
 *
 * 車検は切らしてしまうと公道を走れなくなるため、こちらから入庫を案内できるよう
 * ダッシュボードに出す。期限が過ぎたものも、案内漏れに気づけるよう残して表示する。
 */
export const listInspectionAlerts = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select({
        id: vehicles.id,
        modelName: vehicles.modelName,
        vehicleNumber: vehicles.vehicleNumber,
        inspectionExpiresOn: vehicles.inspectionExpiresOn,
        customerId: customers.id,
        customerName: customers.name,
      })
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(
        and(
          isNotNull(vehicles.inspectionExpiresOn),
          lte(vehicles.inspectionExpiresOn, inspectionAlertLimit()),
        ),
      )
      .orderBy(asc(vehicles.inspectionExpiresOn));
  },
);
