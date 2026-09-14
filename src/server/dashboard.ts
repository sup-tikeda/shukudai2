import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, isNotNull, lte, sql } from "drizzle-orm";
import { cases, customers, quoteItems, quotes, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";

/** 車検期限を「何日先まで」知らせるか。案内を出してから入庫までの準備期間として2か月みておく */
const INSPECTION_ALERT_DAYS = 60;

/** 税込合計を都度計算するSQL断片。明細の数量×単価に税率を掛けて丸める（金額は保存していないため）。 */
const taxIncludedTotal = sql<number>`coalesce(sum(round(${quoteItems.quantity} * ${quoteItems.unitPrice} * (1 + ${quotes.taxRate} / 100))), 0)::int`;

/** ダッシュボードに出す件数と金額。画面を開いた時点の状況を一目で掴むためのもの。 */
export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const [
      [customerCount],
      [vehicleCount],
      [openCaseCount],
      [invoiceTotal],
      [quoteTotal],
      [inspectionAlertCount],
    ] = await Promise.all([
      db.select({ value: count() }).from(customers),
      db.select({ value: count() }).from(vehicles),
      // 「対応が必要な案件」として、完了済み以外を数える
      db
        .select({ value: count() })
        .from(cases)
        .where(sql`${cases.status} <> '完了済み'`),
      // 請求書の税込合計（＝確定した売上）
      db
        .select({ value: taxIncludedTotal })
        .from(quotes)
        .innerJoin(quoteItems, eq(quoteItems.quoteId, quotes.id))
        .where(eq(quotes.docType, "請求書")),
      // 見積書の税込合計（＝まだ請求していない、見込みの売上）
      db
        .select({ value: taxIncludedTotal })
        .from(quotes)
        .innerJoin(quoteItems, eq(quoteItems.quoteId, quotes.id))
        .where(eq(quotes.docType, "見積書")),
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
    ]);

    return {
      customers: customerCount.value,
      vehicles: vehicleCount.value,
      openCases: openCaseCount.value,
      invoiceTotal: invoiceTotal.value,
      quoteTotal: quoteTotal.value,
      inspectionAlertCount: inspectionAlertCount.value,
    };
  },
);

/**
 * 車検期限の判定に使う「今日から何日先まで」を、DB側の現在日付を基準に組み立てる。
 *
 * パラメータの型を明示しないと、Postgresが date + 整数 の演算子を一意に決められず
 * エラーになる（"operator is not unique: date + unknown"）ため、::int で明示的にキャストする。
 * getDashboardStats と listInspectionAlerts の両方で同じ条件を使うため関数化している。
 */
function inspectionAlertLimit() {
  return sql`current_date + ${INSPECTION_ALERT_DAYS}::int`;
}

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
