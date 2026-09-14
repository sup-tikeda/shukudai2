import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell, StatTile } from "~/components/ui/layout";
import { getDashboardStats } from "~/server/dashboard";
import { getCurrentUser } from "~/server/session";

export const Route = createFileRoute("/")({
  // 未ログインの場合、getCurrentUser がサーバー側で /login へリダイレクトする
  loader: async () => ({
    me: await getCurrentUser(),
    stats: await getDashboardStats(),
  }),
  component: DashboardPage,
});

const menuItems = [
  {
    to: "/customers",
    title: "顧客",
    description: "顧客情報の登録・確認",
    hint: "連絡先・住所・保有車両",
  },
  {
    to: "/vehicles",
    title: "車両",
    description: "お預かりしている車両の管理",
    hint: "モデル・車検期限・整備履歴",
  },
  {
    to: "/cases",
    title: "案件",
    description: "整備・修理の作業案件",
    hint: "ステータス・担当者・予定日",
  },
  {
    to: "/quotes",
    title: "見積・請求",
    description: "見積書・請求書の作成",
    hint: "明細の登録と金額の自動計算",
  },
] as const;

function DashboardPage() {
  const { me, stats } = Route.useLoaderData();

  return (
    <AppShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
        <div className="flex gap-3.5">
          <span aria-hidden className="mt-1 w-1 shrink-0 rounded-full bg-accent" />
          <div>
            <p className="text-xs font-black tracking-[0.25em] text-accent uppercase">
              Dashboard
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight">
              バイクショップ店舗管理
            </h1>
          </div>
        </div>
        <p className="text-sm text-ink-muted">
          {me.name}（{me.username}）としてログイン中
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="顧客" value={stats.customers} unit="名" />
        <StatTile label="車両" value={stats.vehicles} unit="台" />
        <StatTile label="対応中の案件" value={stats.openCases} unit="件" />
        {/* 4つの中でいちばん見てほしい数字なので、ここだけ塗りつぶす */}
        <StatTile
          label="請求金額（税込）"
          value={`¥${stats.invoiceTotal.toLocaleString()}`}
          accent
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className="group relative overflow-hidden rounded-xl border border-line bg-surface p-6 shadow-sm shadow-ink/5 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-md hover:shadow-ink/10"
          >
            {/* 背景の大きな連番。情報ではなく目印なので、ごく薄く敷く */}
            <span
              aria-hidden
              className="absolute -top-3 right-3 text-7xl font-black text-line/60 tabular-nums transition-colors group-hover:text-accent/15"
            >
              {index + 1}
            </span>
            <div className="relative">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight">
                  {item.title}
                </h2>
                <span className="text-ink-faint transition-all group-hover:translate-x-1 group-hover:text-accent">
                  →
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-ink-muted">
                {item.description}
              </p>
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink-faint">
                {item.hint}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-sm">
        {me.role === "admin" ? (
          <Link
            to="/master"
            className="text-ink-muted underline underline-offset-4 transition-colors hover:text-accent"
          >
            マスタ管理（社員・会社設定）
          </Link>
        ) : (
          <span />
        )}
        <span className="flex flex-wrap gap-4">
          {/*
            店舗の紹介ページ（お客様向け）。管理画面とは配色も役割も違うため、
            作業中の画面を閉じずに見られるよう別ウィンドウで開く
          */}
          <Link
            to="/lp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-faint underline underline-offset-4 transition-colors hover:text-accent"
          >
            店舗紹介ページ（別ウィンドウ）
          </Link>
          <Link
            to="/contact"
            className="text-ink-faint underline underline-offset-4 transition-colors hover:text-accent"
          >
            問い合わせフォーム
          </Link>
        </span>
      </div>
    </AppShell>
  );
}
