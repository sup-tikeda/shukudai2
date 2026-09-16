import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { workItems } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession, requireSession } from "~/server/authGuard";
import {
  workItemIdSchema,
  workItemInputSchema,
  workItemUpdateInputSchema,
} from "~/lib/validation";

/** 作業マスタの一覧（設定画面用）。admin限定。 */
export const listWorkItems = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();
    return db.select().from(workItems).orderBy(asc(workItems.code));
  },
);

/**
 * 見積・請求の明細入力で選ぶための一覧。
 * 見積・請求は一般ユーザーも作るため、読み取りはadmin限定にしない
 * （登録・編集・削除はadmin限定 = 下の各関数）。
 */
export const listWorkItemOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();
    return db
      .select({
        id: workItems.id,
        code: workItems.code,
        name: workItems.name,
        unitPrice: workItems.unitPrice,
        taxRate: workItems.taxRate,
        itemType: workItems.itemType,
      })
      .from(workItems)
      .orderBy(asc(workItems.code));
  },
);

/** 作業マスタを新規作成する */
export const createWorkItem = createServerFn({ method: "POST" })
  .validator(workItemInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();
    await db.insert(workItems).values(data);
  });

/** 作業マスタを更新する */
export const updateWorkItem = createServerFn({ method: "POST" })
  .validator(workItemUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    const { id, ...values } = data;
    await db.update(workItems).set(values).where(eq(workItems.id, id));
  });

/**
 * 作業マスタを削除する。
 * 過去の明細（quote_items）は名前・単価・税率を独立して持っているため、
 * ここを消しても既存の見積・請求には影響しない。
 */
export const deleteWorkItem = createServerFn({ method: "POST" })
  .validator(workItemIdSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();
    await db.delete(workItems).where(eq(workItems.id, data.id));
  });
