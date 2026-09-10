import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { serve } from "srvx";
import { staticMiddleware } from "srvx/static";

// 起動時に .env があれば読み込む。
// 実運用では .env を置かず、プロセスの環境変数（compose の env_file など）で渡す。
const envFile = fileURLToPath(new URL("./.env", import.meta.url));
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

// アプリ本体は読み込んだ時点で環境変数を検証するため、静的importは使えない
// （静的importは上の .env 読み込みより先に評価されてしまう）。
// 環境変数を整えたあとに動的importで読み込む。
const handler = (await import("./dist/server/server.js")).default;

// vite build が出力するのは { fetch } ハンドラのみで待ち受けは含まれないため、
// ここでHTTPサーバーとして起動する。
serve({
  // リバースプロキシを置かない構成なので、静的アセット(dist/client)もこのプロセスが返す。
  // dist/client 配下はビルド時にファイル名へハッシュが付くため長期キャッシュしてよい。
  middleware: [
    staticMiddleware({
      dir: fileURLToPath(new URL("./dist/client", import.meta.url)),
      maxAge: 60 * 60 * 24 * 365,
      immutable: true,
    }),
  ],
  fetch: handler.fetch,
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST ?? "0.0.0.0",
});
