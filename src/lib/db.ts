import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/db/schema";
import { env } from "./env";

type Database = ReturnType<typeof createDb>;

/**
 * Cloudflare Workers では Hyperdrive 経由で接続するため、接続文字列は
 * リクエスト毎にエントリポイント（src/server.ts）から渡される。
 * それ以外の環境（`pnpm dev` を Node で動かす場合や CLI スクリプト）では
 * 未設定のままとなり、.env の DATABASE_URL にそのまま接続する。
 */
let overrideConnectionString: string | undefined;

export function setDatabaseConnectionString(connectionString: string) {
  if (connectionString === overrideConnectionString) {
    return;
  }
  overrideConnectionString = connectionString;
  instance = undefined;
}

function createDb() {
  const client = postgres(overrideConnectionString ?? env.DATABASE_URL, {
    // Hyperdrive は接続を使い回すため、接続毎の型情報取得と多数の接続を避ける
    max: 5,
    fetch_types: false,
  });

  return drizzle(client, { schema });
}

let instance: Database | undefined;

/**
 * Workers はモジュール読み込み時（グローバルスコープ）での乱数生成や通信を禁止しているため、
 * 接続の作成は最初に使われた時まで遅らせる。
 * 呼び出し側を変えずに済むよう、`db` は実体への Proxy として公開する。
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    instance ??= createDb();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
