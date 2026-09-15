import { createFileRoute, Link } from "@tanstack/react-router";
import { AreaChart, DonutChart } from "~/components/ui/chart";
import { button } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  PageHeader,
  remainingDays,
  StatTile,
} from "~/components/ui/layout";
import {
  getCaseStatusCounts,
  getDashboardStats,
  getMonthlyRevenue,
  listInspectionAlerts,
} from "~/server/dashboard";
import { getCurrentUser } from "~/server/session";

export const Route = createFileRoute("/")({
  // 未ログインの場合、getCurrentUser がサーバー側で /login へリダイレクトする。
  // 5つは互いに依存しないので、順番に待たず同時に取得する（表示までの待ち時間を短くするため）
  loader: async () => {
    const [me, stats, revenue, caseStatus, alerts] = await Promise.all([
      getCurrentUser(),
      getDashboardStats(),
      getMonthlyRevenue(),
      getCaseStatusCounts(),
      listInspectionAlerts(),
    ]);
    return { me, stats, revenue, caseStatus, alerts };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { me, stats, revenue, caseStatus, alerts } = Route.useLoaderData();

  // 1画面に収めるため、アラートは先頭3台だけ出して残りは件数で示す
  const visibleAlerts = alerts.slice(0, 3);
  const hiddenAlertCount = alerts.length - visibleAlerts.length;

  const totalCases =
    caseStatus.未作業 + caseStatus.作業中 + caseStatus.完了済み;
  const doneRate =
    totalCases === 0 ? 0 : Math.round((caseStatus.完了済み / totalCases) * 100);

  return (
    <AppShell>
      {/* 見出しの体裁は他の画面と共通（PageHeader）にそろえている */}
      <PageHeader
        eyebrow="Dashboard"
        title="バイクショップ店舗管理"
        actions={
          <p className="text-sm text-ink-muted">
            {me.name}（{me.username}）としてログイン中
          </p>
        }
      />

      {/* 件数のまとめ。画面のいちばん上で「いま何件あるか」を押さえる */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="顧客" value={stats.customers} unit="名" />
        <StatTile label="車両" value={stats.vehicles} unit="台" />
        <StatTile
          label="対応中の案件"
          value={stats.openCases}
          unit="件"
          sub={`未作業 ${caseStatus.未作業} ／ 作業中 ${caseStatus.作業中}`}
        />
        {/* 要対応。0台のときは赤くせず、残っているときだけ目に留まるようにする */}
        <StatTile
          label="車検切れ間近"
          value={stats.inspectionAlertCount}
          unit="台"
          tone={stats.inspectionAlertCount > 0 ? "danger" : "default"}
          sub={`期限切れ・${stats.inspectionAlertDays}日以内`}
        />
      </div>

      {/* 下段はグラフと一覧。横に並べて、スクロールせずに全体を見渡せるようにする */}
      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Card title="売上の推移" count="直近6か月">
            <div className="px-4 pt-3 pb-1">
              {/* 確定した売上と、これから入る見込みを並べて対比させる */}
              <div className="flex flex-wrap items-end gap-x-6 gap-y-1">
                <div>
                  <p className="text-[11px] font-bold text-ink-faint uppercase">
                    請求金額（税込・全期間）
                  </p>
                  <p className="text-2xl font-black tracking-tight text-accent tabular-nums">
                    ¥{stats.invoiceTotal.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-ink-faint uppercase">
                    見積金額（税込・全期間）
                  </p>
                  <p className="text-xl font-black tracking-tight tabular-nums">
                    ¥{stats.quoteTotal.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="mt-1">
                <AreaChart points={revenue} />
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card title="案件の状況" count={`${totalCases} 件`}>
            <div className="px-4 py-4">
              <DonutChart
                centerValue={`${doneRate}%`}
                centerLabel="完了"
                segments={[
                  {
                    label: "未作業",
                    value: caseStatus.未作業,
                    color: "var(--color-ink-faint)",
                  },
                  {
                    label: "作業中",
                    value: caseStatus.作業中,
                    color: "var(--color-accent)",
                  },
                  {
                    label: "完了済み",
                    value: caseStatus.完了済み,
                    color: "var(--color-success)",
                  },
                ]}
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {/* 車検切れは店舗側から案内しないと気づかれないため、開いてすぐ目に入る位置に置く */}
          <Card
            title="車検期限が近い車両"
            count={`${alerts.length} 台`}
            actions={
              <Link
                to="/vehicles"
                className={button({ variant: "ghost", size: "sm" })}
              >
                一覧へ
              </Link>
            }
          >
            {alerts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-ink-faint">
                期限が近い車両はありません。
              </p>
            ) : (
              <ul>
                {visibleAlerts.map((alert) => {
                  const days = remainingDays(alert.inspectionExpiresOn) ?? 0;
                  // 当日はまだ切れていないので「本日」。過ぎたものだけ「期限切れ」にする
                  const expired = days < 0;
                  return (
                    <li
                      key={alert.id}
                      className="border-b border-line last:border-b-0"
                    >
                      <Link
                        to="/vehicles/$id"
                        params={{ id: alert.id }}
                        className="block px-4 py-2.5 transition-colors hover:bg-surface-raised"
                      >
                        <div className="flex items-center gap-2">
                          <Badge tone={days <= 0 ? "accent" : "neutral"}>
                            {expired
                              ? `${-days}日超過`
                              : days === 0
                                ? "本日期限"
                                : `あと${days}日`}
                          </Badge>
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {alert.modelName}
                          </p>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-faint">
                          {alert.customerName} ／ {alert.inspectionExpiresOn}
                        </p>
                      </Link>
                    </li>
                  );
                })}
                {hiddenAlertCount > 0 ? (
                  <li className="border-t border-line px-4 py-2 text-[11px] text-ink-faint">
                    ほか {hiddenAlertCount} 台
                  </li>
                ) : null}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-4 text-xs">
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
      </div>
    </AppShell>
  );
}
