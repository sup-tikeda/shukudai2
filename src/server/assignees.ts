import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { assignees } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession, requireSession } from "~/server/authGuard";
import {
  assigneeIdSchema,
  assigneeInputSchema,
  assigneeUpdateInputSchema,
} from "~/lib/validation";

/**
 * 担当者の一覧（並び順→名前順）。
 * 案件の担当者を選ぶときに全員が使うため、閲覧はログインしていれば誰でもできる。
 */
export const listAssignees = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select()
      .from(assignees)
      .orderBy(asc(assignees.sortOrder), asc(assignees.name));
  },
);

/** 担当者を登録する（マスタの変更は admin のみ） */
export const createAssignee = createServerFn({ method: "POST" })
  .validator(assigneeInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db.insert(assignees).values(data);
  });

/** 担当者を更新する */
export const updateAssignee = createServerFn({ method: "POST" })
  .validator(assigneeUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    const { id, ...values } = data;
    await db.update(assignees).set(values).where(eq(assignees.id, id));
  });

/**
 * 担当者を削除する。
 * 案件側は担当者名を文字列で持っているため、削除しても過去の案件の記録は変わらない
 * （「今後この人を選べなくする」という意味の削除）。
 */
export const deleteAssignee = createServerFn({ method: "POST" })
  .validator(assigneeIdSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db.delete(assignees).where(eq(assignees.id, data.id));
  });
