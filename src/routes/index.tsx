import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  remainingDays,
  Row,
  RowList,
  StatTile,
} from "~/components/ui/layout";
import { getDashboardStats, listInspectionAlerts } from "~/server/dashboard";
import { getCurrentUser } from "~/server/session";

export const Route = createFileRoute("/")({
  // 未ログインの場合、getCurrentUser がサーバー側で /login へリダイレクトする
  loader: async () => ({
    me: await getCurrentUser(),
    stats: await getDashboardStats(),
    alerts: await listInspectionAlerts(),
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
  const { me, stats, alerts } = Route.useLoaderData();

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

      {/* 6枚になったため、4列だと最終行が半端になる。3列×2段にして揃える */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="顧客" value={stats.customers} unit="名" />
        <StatTile label="車両" value={stats.vehicles} unit="台" />
        <StatTile label="対応中の案件" value={stats.openCases} unit="件" />
        {/* 8つの中でいちばん見てほしい数字なので、ここだけ塗りつぶす */}
        <StatTile
          label="請求金額（税込）"
          value={`¥${stats.invoiceTotal.toLocaleString()}`}
          accent
        />
        {/* 確定売上（請求金額）と対にして、まだ入っていない見込み売上が分かるようにする */}
        <StatTile
          label="見積中の金額（税込）"
          value={`¥${stats.quoteTotal.toLocaleString()}`}
        />
        {/* 緊急度の高い数字なので、下のアラート一覧に埋もれないようここでも件数だけ示す */}
        <StatTile
          label="車検切れ間近"
          value={stats.inspectionAlertCount}
          unit="台"
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

      {/* 車検切れは店舗側から案内しないと気づかれないため、開いてすぐ目に入る位置に置く */}
      {alerts.length > 0 ? (
        <div className="mt-8">
          <Card title="車検期限が近い車両" count={`${alerts.length} 台`}>
            <RowList>
              {alerts.map((alert) => {
                const days = remainingDays(alert.inspectionExpiresOn);
                const expired = days === 0;
                return (
                  <Row
                    key={alert.id}
                    actions={
                      <Link
                        to="/vehicles/$id"
                        params={{ id: alert.id }}
                        className={button({ variant: "outline", size: "sm" })}
                      >
                        車両を見る
                      </Link>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={expired ? "accent" : "neutral"}>
                        {expired ? "期限切れ" : `あと${days}日`}
                      </Badge>
                      <p className="font-medium break-words">
                        {alert.modelName}
                        {alert.vehicleNumber ? `（${alert.vehicleNumber}）` : ""}
                      </p>
                    </div>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {alert.customerName} ／ 車検期限{" "}
                      {alert.inspectionExpiresOn}
                    </p>
                  </Row>
                );
              })}
            </RowList>
          </Card>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5 text-sm">
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
