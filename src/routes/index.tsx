import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";
import { getCurrentUser } from "~/server/session";

export const Route = createFileRoute("/")({
  // 未ログインの場合、getCurrentUser がサーバー側で /login へリダイレクトする
  loader: () => getCurrentUser(),
  component: DashboardPage,
});

const menuItems = [
  {
    to: "/customers",
    title: "顧客",
    description: "顧客情報の登録・確認を行います。",
  },
  {
    to: "/vehicles",
    title: "車両",
    description: "お預かりしている車両（バイク）の情報を管理します。",
  },
  {
    to: "/cases",
    title: "案件",
    description: "整備・修理などの作業案件を管理します。",
  },
  {
    to: "/quotes",
    title: "見積・請求",
    description: "見積書・請求書の作成と明細の管理を行います。",
  },
] as const;

function DashboardPage() {
  const me = Route.useLoaderData();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/login" });
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">バイクショップ店舗管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            {me.name}（{me.username}）としてログイン中
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={button({ variant: "outline", size: "sm" })}
        >
          ログアウト
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {menuItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="block rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:bg-slate-50"
          >
            <h2 className="font-medium">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{item.description}</p>
          </Link>
        ))}

        {me.role === "admin" ? (
          <Link
            to="/master"
            className="block rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:bg-slate-50"
          >
            <h2 className="font-medium">マスタ</h2>
            <p className="mt-1 text-sm text-slate-500">
              社員（ログインアカウント）と店舗設定を管理します。
            </p>
          </Link>
        ) : null}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/contact" className="underline">
          問い合わせフォーム
        </Link>
      </p>
    </main>
  );
}
