import { createServerFn } from "@tanstack/react-start";
import {
  and,
  asc,
  count,
  eq,
  isNotNull,
  isNull,
  lte,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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
 * 「やり忘れチェック」で何日放置されたら知らせるか。
 * 案件の滞留・見積の転換忘れ・送付忘れ、すべて同じ日数で揃えている。
 */
const FOLLOW_UP_ALERT_DAYS = 30;

/** 案件が最後に更新されてから何日経ったか、の判定基準（タイムスタンプ用） */
function followUpStaleSince() {
  return sql`now() - make_interval(days => ${FOLLOW_UP_ALERT_DAYS}::int)`;
}

/** 見積の発行日から何日経ったか、の判定基準（日付用） */
function followUpDateLimit() {
  return sql`current_date - ${FOLLOW_UP_ALERT_DAYS}::int`;
}

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

/** 請求書化された見積書かどうかを調べるための自己結合用の別名 */
const invoicesOf = alias(quotes, "invoices_of");

/**
 * 「やり忘れチェック」。担当者が案件・見積のステータスを手動で管理する運用のため、
 * 動きが止まったまま気づかれずに放置されているものを、開いた時点で気づけるようにする。
 *
 * - 滞留案件：未作業／作業中のまま、直近{@link FOLLOW_UP_ALERT_DAYS}日以上更新されていない案件
 * - 見積の転換忘れ：見積書のまま、まだ請求書に変換されていないもの
 * - 見積の送付忘れ：見積書を作ったのに、送付日が入っていないもの
 */
export const listFollowUps = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const [staleCases, unconvertedQuotes, unsentQuotes] = await Promise.all([
      db
        .select({
          id: cases.id,
          caseNumber: cases.caseNumber,
          title: cases.title,
          status: cases.status,
          updatedAt: cases.updatedAt,
          customerName: customers.name,
          vehicleName: vehicles.modelName,
        })
        .from(cases)
        .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(
          and(
            sql`${cases.status} <> '完了済み'`,
            lte(cases.updatedAt, followUpStaleSince()),
          ),
        )
        .orderBy(asc(cases.updatedAt)),

      db
        .select({
          id: quotes.id,
          docNumber: quotes.docNumber,
          title: quotes.title,
          createdOn: quotes.createdOn,
          caseTitle: cases.title,
          customerName: customers.name,
          vehicleName: vehicles.modelName,
        })
        .from(quotes)
        .innerJoin(cases, eq(quotes.caseId, cases.id))
        .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .leftJoin(invoicesOf, eq(invoicesOf.sourceQuoteId, quotes.id))
        .where(
          and(
            eq(quotes.docType, "見積書"),
            isNull(invoicesOf.id),
            lte(quotes.createdOn, followUpDateLimit()),
          ),
        )
        .orderBy(asc(quotes.createdOn)),

      db
        .select({
          id: quotes.id,
          docNumber: quotes.docNumber,
          title: quotes.title,
          createdOn: quotes.createdOn,
          caseTitle: cases.title,
          customerName: customers.name,
          vehicleName: vehicles.modelName,
        })
        .from(quotes)
        .innerJoin(cases, eq(quotes.caseId, cases.id))
        .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
        .innerJoin(customers, eq(vehicles.customerId, customers.id))
        .where(
          and(
            eq(quotes.docType, "見積書"),
            isNull(quotes.sentOn),
            lte(quotes.createdOn, followUpDateLimit()),
          ),
        )
        .orderBy(asc(quotes.createdOn)),
    ]);

    return {
      days: FOLLOW_UP_ALERT_DAYS,
      staleCases,
      unconvertedQuotes,
      unsentQuotes,
    };
  },
);
