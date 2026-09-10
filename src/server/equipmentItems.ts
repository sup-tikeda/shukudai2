import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { equipmentItems } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession, requireSession } from "~/server/authGuard";
import {
  equipmentItemIdSchema,
  equipmentItemInputSchema,
  equipmentItemUpdateInputSchema,
} from "~/lib/validation";

/** 備品マスタの一覧（作成日時の古い順） */
export const listEquipmentItems = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();

    return db
      .select()
      .from(equipmentItems)
      .orderBy(asc(equipmentItems.createdAt));
  },
);

/**
 * 備品名だけの一覧（名前順）。
 * 貸出登録フォームの候補表示用。ログインしていれば誰でも取得できる（マスタ編集はできない）。
 */
export const listEquipmentItemNames = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const rows = await db
      .select({ name: equipmentItems.name })
      .from(equipmentItems)
      .orderBy(asc(equipmentItems.name));
    return rows.map((row) => row.name);
  },
);

/** 備品マスタを新規作成する */
export const createEquipmentItem = createServerFn({ method: "POST" })
  .validator(equipmentItemInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db.insert(equipmentItems).values({ name: data.name });
  });

/** 備品マスタを更新する */
export const updateEquipmentItem = createServerFn({ method: "POST" })
  .validator(equipmentItemUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db
      .update(equipmentItems)
      .set({ name: data.name })
      .where(eq(equipmentItems.id, data.id));
  });

/** 備品マスタを削除する */
export const deleteEquipmentItem = createServerFn({ method: "POST" })
  .validator(equipmentItemIdSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db.delete(equipmentItems).where(eq(equipmentItems.id, data.id));
  });
