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
      <div className="mb-8">
        <p className="text-xs font-medium tracking-widest text-accent uppercase">
          Dashboard
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          バイクショップ店舗管理
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {me.name}（{me.username}）としてログイン中
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="顧客" value={stats.customers} unit="名" />
        <StatTile label="車両" value={stats.vehicles} unit="台" />
        <StatTile label="対応中の案件" value={stats.openCases} unit="件" />
        <StatTile
          label="請求金額（税込）"
          value={`¥${stats.invoiceTotal.toLocaleString()}`}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="group rounded-xl border border-line bg-surface p-5 transition-colors hover:border-accent/50 hover:bg-surface-raised"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold">{item.title}</h2>
              <span className="text-ink-faint transition-colors group-hover:text-accent">
                →
              </span>
            </div>
            <p className="mt-1 text-sm text-ink-muted">{item.description}</p>
            <p className="mt-3 text-xs text-ink-faint">{item.hint}</p>
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
        <Link
          to="/contact"
          className="text-ink-faint underline underline-offset-4 transition-colors hover:text-accent"
        >
          問い合わせフォーム
        </Link>
      </div>
    </AppShell>
  );
}
