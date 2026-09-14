import type { ReactNode } from "react";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import appCss from "~/styles/app.css?url";
import { getSessionUserOrNull } from "~/server/session";

export const Route = createRootRoute({
  // 上部ナビに「設定」を出すかどうかを全画面で判定できるよう、ここでログイン状態を読む。
  // 未ログインでもリダイレクトしない（ログイン画面・LPもこの loader を通るため）。
  loader: () => getSessionUserOrNull(),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // 社内限定の練習課題アプリのため、検索エンジンに登録されないようにする
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#1a1a1d" },
      { title: "バイクショップ店舗管理" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body className="bg-shell text-ink antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}
