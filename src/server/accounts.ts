import { createServerFn } from "@tanstack/react-start";
import { asc, eq, isNull } from "drizzle-orm";
import { user } from "~/db/auth-schema";
import { staffProfiles } from "~/db/schema";
import { auth } from "~/lib/auth";
import { db } from "~/lib/db";
import { requireAdminSession, requireSession } from "~/server/authGuard";
import {
  accountCreateInputSchema,
  accountIdSchema,
  accountPasswordInputSchema,
  accountUpdateInputSchema,
  staffProfileSaveInputSchema,
} from "~/lib/validation";

/** better-authはメールアドレスを必須とするため、画面には出さない内部専用のメールを組み立てる */
function internalEmailFor(username: string) {
  return `${username}@internal.local`;
}

/**
 * 社員一覧（作成日時の古い順）。ログインアカウントと詳細情報をまとめて返す。
 * 詳細がまだ登録されていない社員もいるため leftJoin で結ぶ。
 */
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
        nameKana: staffProfiles.nameKana,
        birthday: staffProfiles.birthday,
        hiredOn: staffProfiles.hiredOn,
        retiredOn: staffProfiles.retiredOn,
        position: staffProfiles.position,
        qualification: staffProfiles.qualification,
        postalCode: staffProfiles.postalCode,
        address: staffProfiles.address,
        addressLine2: staffProfiles.addressLine2,
        building: staffProfiles.building,
        phone: staffProfiles.phone,
        mobilePhone: staffProfiles.mobilePhone,
        email: staffProfiles.email,
        note: staffProfiles.note,
      })
      .from(user)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .orderBy(asc(user.createdAt));
  },
);

/**
 * 案件の担当者を選ぶための、社員の名前だけの一覧。
 *
 * 案件登録は一般ユーザーも行うため admin 限定にはできない。
 * ただしアカウント名・権限まで見せる必要は無いので、名前だけを返している。
 */
export const listStaffOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    // 退職した社員は選べないようにする（過去の案件に残っている名前はそのまま）
    return db
      .select({ name: user.name })
      .from(user)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .where(isNull(staffProfiles.retiredOn))
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

    // 続けて詳細情報を保存できるよう、作成したユーザーのIDを返す
    const [created] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, data.username));
    return { id: created?.id ?? null };
  });

/**
 * 社員の詳細情報を保存する（無ければ作り、あれば上書きする）。
 * ログインアカウント側（名前・権限・パスワード）とは更新の経路が別なので関数も分けている。
 */
export const saveStaffProfile = createServerFn({ method: "POST" })
  .validator(staffProfileSaveInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    const { userId, ...values } = data;
    await db
      .insert(staffProfiles)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: staffProfiles.userId,
        set: { ...values, updatedAt: new Date() },
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
