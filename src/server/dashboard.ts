import { createServerFn } from "@tanstack/react-start";
import { count, eq, sql } from "drizzle-orm";
import { cases, customers, quoteItems, quotes, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";

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
