import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { shopSettings } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession, requireSession } from "~/server/authGuard";
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

    // 1レコードのみの制約があるため、別のリクエストが先に作っていた場合は
    // 挿入せず（何も返らず）、作られたものを読み直す
    const [created] = await db
      .insert(shopSettings)
      .values({})
      .onConflictDoNothing()
      .returning();
    if (created) {
      return created;
    }

    const [concurrent] = await db.select().from(shopSettings).limit(1);
    return concurrent;
  },
);

/**
 * 明細に使う既定の消費税率。見積・請求を新しく作るときの初期値に使う。
 *
 * 会社情報そのものは admin だけが扱えるが、税率は帳票にも印字される値なので、
 * ログインしていれば読めるようにしている。設定が未登録なら列の既定値（10%）。
 */
export const getDefaultTaxRate = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    const [existing] = await db
      .select({ taxRate: shopSettings.taxRate })
      .from(shopSettings)
      .limit(1);
    return existing?.taxRate ?? 10;
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
