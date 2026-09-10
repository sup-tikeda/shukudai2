import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

/**
 * ログイン必須（ロールは問わない）。
 * 未ログインなら /login へ戻す。貸出リストなど、一般ユーザーも使う画面のサーバー関数から呼ぶ。
 */
export async function requireSession() {
  const headers = getRequest().headers;
  const session = await auth.api.getSession({ headers });
  if (!session) {
    throw redirect({ to: "/login" });
  }
  return { session, headers };
}

/**
 * ログイン必須かつ admin ロール必須。
 * 未ログインなら /login へ、admin以外は / （ダッシュボード）へ戻す。
 * マスタ管理（アカウント・備品）のサーバー関数から共通で呼ぶ。
 */
export async function requireAdminSession() {
  const { session, headers } = await requireSession();
  if (session.user.role !== "admin") {
    throw redirect({ to: "/" });
  }
  return { session, headers };
}
