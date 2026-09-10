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

/**
 * 前段にnginx（Basic認証あり）を置かない環境（Railway等）向けの、アプリ自身での入り口保護。
 * BASIC_AUTH_USER/BASIC_AUTH_PASSWORD が両方設定されている場合のみ有効にする。
 * nginx経由の構成（Docker Compose）では、そちらで既にBasic認証がかかっているため
 * ここでは未設定のままにしておいてよい（二重にかけても害はない）。
 */
function basicAuthMiddleware(user, password) {
  const expected = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
  return (request, next) => {
    if (request.headers.get("authorization") === expected) {
      return next();
    }
    return new Response("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
    });
  };
}

const middleware = [];
if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASSWORD) {
  middleware.push(
    basicAuthMiddleware(process.env.BASIC_AUTH_USER, process.env.BASIC_AUTH_PASSWORD),
  );
}
middleware.push(
  // リバースプロキシを置かない構成なので、静的アセット(dist/client)もこのプロセスが返す。
  // dist/client 配下はビルド時にファイル名へハッシュが付くため長期キャッシュしてよい。
  staticMiddleware({
    dir: fileURLToPath(new URL("./dist/client", import.meta.url)),
    maxAge: 60 * 60 * 24 * 365,
    immutable: true,
  }),
);

// vite build が出力するのは { fetch } ハンドラのみで待ち受けは含まれないため、
// ここでHTTPサーバーとして起動する。
serve({
  middleware,
  fetch: handler.fetch,
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOST ?? "0.0.0.0",
});
