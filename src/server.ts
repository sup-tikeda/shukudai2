import defaultEntry, {
  createServerEntry,
} from "@tanstack/react-start/server-entry";
import { setDatabaseConnectionString } from "~/lib/db";

/**
 * Cloudflare Workers 上でのアプリの入り口。
 *
 * 1. 前段に nginx を置けないため、入り口保護（Basic認証）をここで行う
 * 2. Hyperdrive の接続文字列はリクエストの env からしか取れないため、DB層へ渡す
 *    （Workers はモジュール読み込み時の I/O を禁止しているので、初期化はリクエスト内で行う）
 */
type WorkerEnv = {
  HYPERDRIVE?: { connectionString: string };
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
  fetch: (request, ...rest) => {
    if (!isAuthorized(request)) {
      return new Response("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
      });
    }

    const hyperdrive = (rest[0] as WorkerEnv | undefined)?.HYPERDRIVE;
    if (hyperdrive) {
      setDatabaseConnectionString(hyperdrive.connectionString);
    }

    return defaultEntry.fetch(request, ...rest);
  },
});
