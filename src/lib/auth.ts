import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import * as schema from "~/db/schema";
import { db } from "./db";
import { env } from "./env";

// betterAuth() の戻り値はプラグインに応じて型が変わるため、
// 総称型ではなくファクトリ関数の戻り値から推論する（admin/username プラグインのAPIを保つ）。
type Auth = ReturnType<typeof createAuth>;

function createAuth() {
  return betterAuth({
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
}

let instance: Auth | undefined;

/**
 * Cloudflare Workers はモジュール読み込み時（グローバルスコープ）での乱数生成を禁止しており、
 * better-auth の初期化がそれに該当するため、最初に使われた時まで生成を遅らせる。
 * 呼び出し側を変えずに済むよう、`auth` は実体への Proxy として公開する。
 */
export const auth = new Proxy({} as Auth, {
  get(_target, property) {
    instance ??= createAuth();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
