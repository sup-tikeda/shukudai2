import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "~/db/schema";
import { db } from "./db";
import { env } from "./env";

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // 社内利用のため自己登録は不可。アカウントは `pnpm user:create` で発行する。
    disableSignUp: true,
  },
  // admin: 管理者によるアカウント発行とロール管理に使用する
  // username: メールアドレスではなく「アカウント名」でログインできるようにする
  plugins: [admin(), username(), tanstackStartCookies()],
});
