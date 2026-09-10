import { createServerFn } from "@tanstack/react-start";
import { asc } from "drizzle-orm";
import { user } from "~/db/auth-schema";
import { auth } from "~/lib/auth";
import { db } from "~/lib/db";
import { requireAdminSession } from "~/server/authGuard";
import {
  accountCreateInputSchema,
  accountIdSchema,
  accountPasswordInputSchema,
  accountUpdateInputSchema,
} from "~/lib/validation";

/** better-authはメールアドレスを必須とするため、画面には出さない内部専用のメールを組み立てる */
function internalEmailFor(username: string) {
  return `${username}@internal.local`;
}

/** アカウント一覧（作成日時の古い順） */
export const listAccounts = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();

    return db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .orderBy(asc(user.createdAt));
  },
);

/** アカウントを新規作成する */
export const createAccount = createServerFn({ method: "POST" })
  .validator(accountCreateInputSchema)
  .handler(async ({ data }) => {
    const { headers } = await requireAdminSession();

    await auth.api.createUser({
      headers,
      body: {
        email: internalEmailFor(data.username),
        password: data.password,
        name: data.name,
        role: data.role,
        data: { username: data.username, displayUsername: data.username },
      },
    });
  });

/**
 * アカウントの名前・アカウント名・権限を更新する（パスワードは別関数）。
 * アカウント名が元の値から変わっていない場合は送らない。
 * better-authのusernameプラグインは「自分以外のユーザーを、既存のアカウント名のまま更新する」場合に
 * 誤って「アカウント名が既に使われています」と判定することがあるため、この回避策が必要。
 */
export const updateAccount = createServerFn({ method: "POST" })
  .validator(accountUpdateInputSchema)
  .handler(async ({ data }) => {
    const { headers } = await requireAdminSession();

    const updateData: Record<string, unknown> = {
      name: data.name,
      role: data.role,
    };
    if (data.username !== data.currentUsername) {
      updateData.username = data.username;
      updateData.displayUsername = data.username;
    }

    await auth.api.adminUpdateUser({
      headers,
      body: { userId: data.id, data: updateData },
    });
  });

/** パスワードを再設定する */
export const updateAccountPassword = createServerFn({ method: "POST" })
  .validator(accountPasswordInputSchema)
  .handler(async ({ data }) => {
    const { headers } = await requireAdminSession();

    await auth.api.setUserPassword({
      headers,
      body: { userId: data.id, newPassword: data.password },
    });
  });

/** アカウントを削除する。自分自身は削除できない（誰もログインできなくなるのを防ぐ） */
export const deleteAccount = createServerFn({ method: "POST" })
  .validator(accountIdSchema)
  .handler(async ({ data }) => {
    const { session, headers } = await requireAdminSession();

    if (data.id === session.user.id) {
      throw new Error("自分自身のアカウントは削除できません");
    }

    await auth.api.removeUser({
      headers,
      body: { userId: data.id },
    });
  });
