import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, isNotNull, lte, sql } from "drizzle-orm";
import { cases, customers, quoteItems, quotes, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";

/** 車検期限を「何日先まで」知らせるか。案内を出してから入庫までの準備期間として2か月みておく */
const INSPECTION_ALERT_DAYS = 60;

/** ダッシュボードに出す件数と金額。画面を開いた時点の状況を一目で掴むためのもの。 */
export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const [[customerCount], [vehicleCount], [openCaseCount], [invoiceTotal]] =
      await Promise.all([
        db.select({ value: count() }).from(customers),
        db.select({ value: count() }).from(vehicles),
        // 「対応が必要な案件」として、完了済み以外を数える
        db
          .select({ value: count() })
          .from(cases)
          .where(sql`${cases.status} <> '完了済み'`),
        // 請求書の税込合計。明細から都度計算する（金額は保存していないため）
        db
          .select({
            value: sql<number>`coalesce(sum(round(${quoteItems.quantity} * ${quoteItems.unitPrice} * (1 + ${quotes.taxRate} / 100))), 0)::int`,
          })
          .from(quotes)
          .innerJoin(quoteItems, eq(quoteItems.quoteId, quotes.id))
          .where(eq(quotes.docType, "請求書")),
      ]);

    return {
      customers: customerCount.value,
      vehicles: vehicleCount.value,
      openCases: openCaseCount.value,
      invoiceTotal: invoiceTotal.value,
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

    // 期限の判定はDB側の現在日付で行う（サーバーとDBで時差が生じないようにするため）
    const limit = sql`current_date + ${INSPECTION_ALERT_DAYS}`;

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
          lte(vehicles.inspectionExpiresOn, limit),
        ),
      )
      .orderBy(asc(vehicles.inspectionExpiresOn));
  },
);
