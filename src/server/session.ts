import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import { auth } from "~/lib/auth";

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
