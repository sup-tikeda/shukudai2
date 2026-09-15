import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * 画面の読み込みに時間がかかった時の表示。
 * 何も出さないと、前の画面のまま固まったように見えてしまう。
 * 一瞬で終わる遷移でちらつかないよう、表示は既定の待ち時間（1秒）を過ぎてからになる。
 */
function RoutePending() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-ink-faint">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      読み込み中...
    </div>
  );
}

export function getRouter() {
  return createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPendingComponent: RoutePending,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
