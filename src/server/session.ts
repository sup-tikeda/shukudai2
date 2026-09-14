import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { auth } from "~/lib/auth";
import { requireAdminSession } from "~/server/authGuard";

/**
 * ログイン中のユーザー（未ログインなら null）。
 *
 * getCurrentUser と違って /login へ飛ばさない。ログイン画面・LP・問い合わせフォームなど
 * ログイン不要な画面も含めて全画面で読み込まれる、ルート直下の loader から呼ぶため。
 * 上部ナビに「設定」を出すかどうか（admin かどうか）の判定に使う。
 */
export const getSessionUserOrNull = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });
    if (!session) {
      return null;
    }
    return { name: session.user.name, role: session.user.role ?? null };
  },
);

/**
 * admin でなければ弾く（未ログインは /login、一般ユーザーは / へ戻す）。
 *
 * 設定画面のように「そもそも入れてはいけない」画面の `beforeLoad` から呼ぶ。
 * 各サーバー関数も個別に admin を確認しているが、それだと画面の読み込みが始まってから
 * 弾かれることになるため、入口の時点で止める。
 */
export const assertAdmin = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();
    return null;
  },
);

/** ダッシュボードでログイン中のユーザー名・権限を表示するための最小限の情報 */
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });
    if (!session) {
      throw redirect({ to: "/login" });
    }

    const sessionUser = session.user as typeof session.user & {
      username?: string | null;
    };

    return {
      name: sessionUser.name,
      username: sessionUser.username ?? null,
      role: sessionUser.role ?? null,
    };
  },
);
