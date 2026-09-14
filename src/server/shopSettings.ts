import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { shopSettings } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession } from "~/server/authGuard";
import { shopSettingsInputSchema } from "~/lib/validation";

/**
 * 店舗設定（会社情報・基本税率）。全体で1レコードのみを想定し、無ければ作成する。
 * 会社の情報のため admin のみが編集できる。
 */
export const getShopSettings = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();

    const [existing] = await db.select().from(shopSettings).limit(1);
    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(shopSettings)
      .values({})
      .returning();
    return created;
  },
);

/** 店舗設定を更新する（対象レコードが無い場合は作成する） */
export const updateShopSettings = createServerFn({ method: "POST" })
  .validator(shopSettingsInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    const [existing] = await db.select().from(shopSettings).limit(1);
    if (existing) {
      await db
        .update(shopSettings)
        .set(data)
        .where(eq(shopSettings.id, existing.id));
      return;
    }
    await db.insert(shopSettings).values(data);
  });
