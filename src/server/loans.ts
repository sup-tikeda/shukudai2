import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, isNull } from "drizzle-orm";
import { equipmentItems, equipmentLoans } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";
import { loanIdSchema, loanInputSchema } from "~/lib/validation";

/** 貸出中（未返却）の一覧を貸出日の古い順に返す */
export const listLoans = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();

  return db
    .select({
      id: equipmentLoans.id,
      itemName: equipmentLoans.itemName,
      borrower: equipmentLoans.borrower,
      lentOn: equipmentLoans.lentOn,
    })
    .from(equipmentLoans)
    .where(isNull(equipmentLoans.returnedAt))
    .orderBy(asc(equipmentLoans.lentOn), asc(equipmentLoans.createdAt))
    .limit(200);
});

/**
 * 貸出を1件登録する。
 * 備品名は手入力もできるが、備品マスタに無い名前は登録させない（表記ゆれ・誤入力の防止）。
 */
export const addLoan = createServerFn({ method: "POST" })
  .validator(loanInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [item] = await db
      .select({ id: equipmentItems.id })
      .from(equipmentItems)
      .where(eq(equipmentItems.name, data.itemName))
      .limit(1);
    if (!item) {
      throw new Error(
        "備品マスタに登録されていない備品名です。マスタ画面から先に登録してください。",
      );
    }

    const [saved] = await db
      .insert(equipmentLoans)
      .values(data)
      .returning({ id: equipmentLoans.id });

    return { id: saved.id };
  });

/**
 * 返却する。行は削除せず returnedAt に日時を入れる（履歴を残す）。
 * 未返却のものだけを対象にするため、二重に押しても状態は変わらない。
 */
export const returnLoan = createServerFn({ method: "POST" })
  .validator(loanIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [updated] = await db
      .update(equipmentLoans)
      .set({ returnedAt: new Date() })
      .where(
        and(
          eq(equipmentLoans.id, data.id),
          isNull(equipmentLoans.returnedAt),
        ),
      )
      .returning({ id: equipmentLoans.id });

    // 別の人が先に返却した場合など。一覧を読み直せば消えているので、失敗扱いにはしない。
    return { id: updated?.id ?? null };
  });
