import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/db/schema";
import { env } from "./env";

type Database = ReturnType<typeof createDb>;

function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    // Cloudflare の推奨設定。max は Worker の同時外部接続数の上限に合わせ、
    // fetch_types は配列型を使っていないため無効化して往復を1回減らす。
    max: 5,
    fetch_types: false,
  });

  return drizzle(client, { schema });
}

/**
 * Cloudflare Workers では、あるリクエスト中に作った接続を別のリクエストから使えない
 * （使い回すとクエリが失敗する）。公式にもリクエスト毎の生成が推奨されているため、
 * リクエスト単位の接続を AsyncLocalStorage で持ち回る。
 * エントリポイント（src/server.ts）が Hyperdrive の接続文字列を渡してこれを開始する。
 */
const requestScope = new AsyncLocalStorage<Database>();

export function runWithDatabase<T>(connectionString: string, fn: () => T): T {
  return requestScope.run(createDb(connectionString), fn);
}

/**
 * Workers 以外（Node で動かす CLI スクリプトなど）向けのフォールバック。
 * この場合はプロセス内で使い回して問題ない。
 */
let fallbackInstance: Database | undefined;

/**
 * 呼び出し側を変えずに済むよう、`db` は実体への Proxy として公開する。
 * Workers はモジュール読み込み時（グローバルスコープ）の通信・乱数生成を禁止しているため、
 * 実体の生成は最初に使われた時まで遅らせている。
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const target =
      requestScope.getStore() ??
      (fallbackInstance ??= createDb(env.DATABASE_URL));
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});
