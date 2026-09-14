import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import {
  cases,
  customers,
  quoteItems,
  quotes,
  shopSettings,
  vehicles,
} from "~/db/schema";
import { db } from "~/lib/db";
import { summarizeItems } from "~/lib/quote-summary";
import { requireSession } from "~/server/authGuard";
import {
  quoteIdSchema,
  quoteInputSchema,
  quoteItemIdSchema,
  quoteItemInputSchema,
  quoteItemUpdateInputSchema,
  quoteUpdateInputSchema,
} from "~/lib/validation";

/** 見積・請求の一覧（作成日順）。案件名・顧客名・車両名と集計金額をあわせて返す。 */
export const listQuotes = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();

  const rows = await db
    .select({
      id: quotes.id,
      docNumber: quotes.docNumber,
      caseId: quotes.caseId,
      title: quotes.title,
      docType: quotes.docType,
      taxRate: quotes.taxRate,
      createdOn: quotes.createdOn,
      sentOn: quotes.sentOn,
      caseTitle: cases.title,
      customerName: customers.name,
      vehicleName: vehicles.modelName,
    })
    .from(quotes)
    .innerJoin(cases, eq(quotes.caseId, cases.id))
    .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
    .innerJoin(customers, eq(vehicles.customerId, customers.id))
    .orderBy(asc(quotes.createdOn));

  const items = await db
    .select({
      quoteId: quoteItems.quoteId,
      quantity: quoteItems.quantity,
      unitPrice: quoteItems.unitPrice,
      taxRate: quoteItems.taxRate,
    })
    .from(quoteItems);

  return rows.map((row) => ({
    ...row,
    ...summarizeItems(items.filter((item) => item.quoteId === row.id)),
  }));
});

/** 見積・請求タイトルだけの一覧は不要（案件単位で作成するため案件一覧から選ぶ） */

/** 見積・請求1件の詳細（明細項目・集計金額を含む） */
export const getQuote = createServerFn({ method: "GET" })
  .validator(quoteIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [quote] = await db
      .select({
        id: quotes.id,
        docNumber: quotes.docNumber,
        caseId: quotes.caseId,
        caseTitle: cases.title,
        customerName: customers.name,
        vehicleName: vehicles.modelName,
        title: quotes.title,
        docType: quotes.docType,
        taxRate: quotes.taxRate,
        note: quotes.note,
        internalNote: quotes.internalNote,
        createdOn: quotes.createdOn,
        sentOn: quotes.sentOn,
      })
      .from(quotes)
      .innerJoin(cases, eq(quotes.caseId, cases.id))
      .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(eq(quotes.id, data.id));
    if (!quote) {
      throw new Error("見積・請求が見つかりません。");
    }

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, data.id))
      .orderBy(asc(quoteItems.createdAt));

    return { ...quote, items, summary: summarizeItems(items) };
  });

/**
 * 帳票（見積書・請求書）の印刷に必要な情報を一度に返す。
 * 宛名に使う顧客の住所や、発行元として印字する会社設定までまとめて取得する。
 * 会社設定はまだ登録されていないこともあるため、無い場合は null を返す。
 */
export const getQuoteForPrint = createServerFn({ method: "GET" })
  .validator(quoteIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [quote] = await db
      .select({
        id: quotes.id,
        docNumber: quotes.docNumber,
        docType: quotes.docType,
        title: quotes.title,
        taxRate: quotes.taxRate,
        note: quotes.note,
        createdOn: quotes.createdOn,
        sentOn: quotes.sentOn,
        caseTitle: cases.title,
        vehicleModelName: vehicles.modelName,
        vehicleNumber: vehicles.vehicleNumber,
        customerName: customers.name,
        customerPostalCode: customers.postalCode,
        customerAddress: customers.address,
        customerAddressLine2: customers.addressLine2,
        customerBuilding: customers.building,
      })
      .from(quotes)
      .innerJoin(cases, eq(quotes.caseId, cases.id))
      .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(eq(quotes.id, data.id));
    if (!quote) {
      throw new Error("見積・請求が見つかりません。");
    }

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, data.id))
      .orderBy(asc(quoteItems.createdAt));

    // 会社設定（発行元）は admin しか編集できないが、帳票の印字には全員が必要になる
    const [settings] = await db.select().from(shopSettings).limit(1);

    return {
      quote,
      items,
      summary: summarizeItems(items),
      shop: settings ?? null,
    };
  });

/** 見積・請求を新規作成する（明細項目は別途追加する） */
export const createQuote = createServerFn({ method: "POST" })
  .validator(quoteInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [saved] = await db
      .insert(quotes)
      .values(data)
      .returning({ id: quotes.id });
    return { id: saved.id };
  });

/** 見積・請求を更新する */
export const updateQuote = createServerFn({ method: "POST" })
  .validator(quoteUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const { id, ...values } = data;
    await db.update(quotes).set(values).where(eq(quotes.id, id));
  });

/**
 * 見積書をもとに請求書を作る（明細ごと複製する）。
 *
 * 元の見積書はそのまま残す。作業の承諾を得た証跡として見積書を保管しておく必要があり、
 * 種別を書き換えてしまうと「いくらで見積もったか」が残らなくなるため。
 * 発行日は元の見積書の日付ではなく、請求書を作った当日にする。
 */
export const convertQuoteToInvoice = createServerFn({ method: "POST" })
  .validator(quoteIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [source] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, data.id));
    if (!source) {
      throw new Error("見積・請求が見つかりません。");
    }
    if (source.docType === "請求書") {
      throw new Error("すでに請求書です。見積書からのみ変換できます。");
    }

    const [created] = await db
      .insert(quotes)
      .values({
        caseId: source.caseId,
        title: source.title,
        docType: "請求書",
        taxRate: source.taxRate,
        note: source.note,
        internalNote: source.internalNote,
      })
      .returning({ id: quotes.id });

    const items = await db
      .select()
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, source.id))
      .orderBy(asc(quoteItems.createdAt));

    if (items.length > 0) {
      await db.insert(quoteItems).values(
        items.map((item) => ({
          quoteId: created.id,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
        })),
      );
    }

    return { id: created.id };
  });

/** 見積・請求を削除する（明細項目も連鎖して削除される） */
export const deleteQuote = createServerFn({ method: "POST" })
  .validator(quoteIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    await db.delete(quotes).where(eq(quotes.id, data.id));
  });

/** 明細項目を追加する */
export const createQuoteItem = createServerFn({ method: "POST" })
  .validator(quoteItemInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    await db.insert(quoteItems).values(data);
  });

/** 明細項目を更新する */
export const updateQuoteItem = createServerFn({ method: "POST" })
  .validator(quoteItemUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const { id, ...values } = data;
    await db.update(quoteItems).set(values).where(eq(quoteItems.id, id));
  });

/** 明細項目を削除する */
export const deleteQuoteItem = createServerFn({ method: "POST" })
  .validator(quoteItemIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    await db.delete(quoteItems).where(eq(quoteItems.id, data.id));
  });
