import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";
import { getCurrentUser } from "~/server/session";

export const Route = createFileRoute("/")({
  // 未ログインの場合、getCurrentUser がサーバー側で /login へリダイレクトする
  loader: () => getCurrentUser(),
  component: DashboardPage,
});

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
          <h1 className="text-xl font-bold">社内ダッシュボード</h1>
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
        <Link
          to="/loans"
          className="block rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:bg-slate-50"
        >
          <h2 className="font-medium">社内備品 貸出リスト</h2>
          <p className="mt-1 text-sm text-slate-500">
            備品の貸出登録・返却を行います。
          </p>
        </Link>

        {me.role === "admin" ? (
          <Link
            to="/master"
            className="block rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:bg-slate-50"
          >
            <h2 className="font-medium">マスタ</h2>
            <p className="mt-1 text-sm text-slate-500">
              社員（ログインアカウント）と備品のマスタ管理を行います。
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
