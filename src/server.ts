import defaultEntry, {
  createServerEntry,
} from "@tanstack/react-start/server-entry";
import { runWithDatabase } from "~/lib/db";

/**
 * Cloudflare Workers 上でのアプリの入り口。
 *
 * 1. 前段に nginx を置けないため、入り口保護（Basic認証）をここで行う
 * 2. 認証を通ったリクエストのうち、静的ファイルにあたるものを配信する
 *    （wrangler.jsonc の run_worker_first により、画像やJS・CSSもここへ来る）
 * 3. Hyperdrive の接続文字列はリクエストの env からしか取れないため、DB層へ渡す
 *    （Workers はモジュール読み込み時の I/O を禁止しているので、初期化はリクエスト内で行う）
 */
type WorkerEnv = {
  HYPERDRIVE?: { connectionString: string };
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
};

function isAuthorized(request: Request) {
  const user = process.env.BASIC_AUTH_USER;
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!user || !password) {
    return true;
  }
  const expected = `Basic ${btoa(`${user}:${password}`)}`;
  return request.headers.get("authorization") === expected;
}

export default createServerEntry({
  fetch: async (request, ...rest) => {
    if (!isAuthorized(request)) {
      return new Response("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
      });
    }

    const env = rest[0] as WorkerEnv | undefined;

    // 該当する静的ファイルがあればそれを返し、無ければ（404）アプリ側に任せる。
    // 取得系だけを対象にするのは、サーバー関数の POST に対して静的配信側が
    // 405 を返し、それをそのまま返してしまうと画面が動かなくなるため。
    if (env?.ASSETS && (request.method === "GET" || request.method === "HEAD")) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) {
        return asset;
      }
    }

    const hyperdrive = env?.HYPERDRIVE;
    if (!hyperdrive) {
      return defaultEntry.fetch(request, ...rest);
    }

    // DB接続はリクエスト単位で作る（別リクエストで作った接続は Workers 上で使えない）
    return runWithDatabase(hyperdrive.connectionString, () =>
      defaultEntry.fetch(request, ...rest),
    );
  },
});
