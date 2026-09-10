import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, TextField } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";
import { loanInputSchema } from "~/lib/validation";
import { listEquipmentItemNames } from "~/server/equipmentItems";
import { addLoan, listLoans, returnLoan } from "~/server/loans";

export const Route = createFileRoute("/loans")({
  // 未ログインの場合、各サーバー関数がサーバー側で /login へリダイレクトする
  loader: async () => ({
    loans: await listLoans(),
    itemNames: await listEquipmentItemNames(),
  }),
  component: LoanListPage,
});

type FieldErrors = Partial<Record<"itemName" | "borrower" | "lentOn", string>>;

/**
 * 「今日」を YYYY-MM-DD で返す。
 * toISOString はUTCになるため使わず、実行環境のタイムゾーンで組み立てる。
 * サーバーとブラウザで値がずれないよう、コンテナにも TZ=Asia/Tokyo を設定している。
 */
function todayString() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 「2026-09-01」を「2026/09/01」の表示にする */
function formatDate(value: string) {
  return value.replaceAll("-", "/");
}

function LoanListPage() {
  const { loans, itemNames } = Route.useLoaderData();
  const router = useRouter();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // 返却処理中の行。連打で同じ行を二重に送らないために持つ
  const [returningId, setReturningId] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    const parsed = loanInputSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors({
        itemName: flattened.itemName?.[0],
        borrower: flattened.borrower?.[0],
        lentOn: flattened.lentOn?.[0],
      });
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);
    try {
      await addLoan({ data: parsed.data });
      form.reset();
      // 一覧をサーバーから読み直す（DBが正になるため画面側で足し込まない）
      await router.invalidate();
    } catch (error) {
      // 備品マスタに無い名前など、サーバー側のチェックで弾かれた理由をそのまま表示する
      setFormError(
        error instanceof Error
          ? error.message
          : "登録に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleReturn(id: string) {
    setFormError(null);
    setReturningId(id);
    try {
      await returnLoan({ data: { id } });
      await router.invalidate();
    } catch {
      setFormError("返却に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setReturningId(null);
    }
  }

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/login" });
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm">
            <Link to="/" className="text-slate-500 underline">
              ← ダッシュボードへ
            </Link>
          </p>
          <h1 className="text-xl font-bold">社内備品 貸出リスト</h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={button({ variant: "outline", size: "sm" })}
        >
          ログアウト
        </button>
      </div>

      {/* 登録フォーム。狭い画面では1列、広い画面では3列に並ぶ */}
      <form
        onSubmit={handleAdd}
        className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            name="itemName"
            label="備品名"
            required
            invalid={!!errors.itemName}
            error={errors.itemName}
            suggestions={itemNames}
          />
          <TextField
            name="borrower"
            label="借りた人"
            required
            invalid={!!errors.borrower}
            error={errors.borrower}
          />
          <TextField
            name="lentOn"
            label="貸出日"
            type="date"
            required
            defaultValue={todayString()}
            invalid={!!errors.lentOn}
            error={errors.lentOn}
          />
        </div>

        <button
          type="submit"
          className={button({ className: "mt-4 w-full sm:w-auto" })}
          disabled={pending}
        >
          {pending ? "追加中..." : "追加"}
        </button>

        {formError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {formError}
          </p>
        ) : null}
      </form>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-medium">貸出中の備品</h2>
          <span className="text-sm text-slate-500">{loans.length} 件</span>
        </div>

        {loans.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">貸出中の備品はありません。</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200">
            {loans.map((loan) => (
              <li
                key={loan.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  {/* 長い備品名でも横スクロールが出ないよう折り返す */}
                  <p className="font-medium break-words">{loan.itemName}</p>
                  <p className="text-sm text-slate-500">
                    {loan.borrower} ／ 貸出日 {formatDate(loan.lentOn)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReturn(loan.id)}
                  disabled={returningId === loan.id}
                  className={button({ variant: "outline", size: "sm" })}
                  aria-label={`${loan.itemName} を返却する`}
                >
                  {returningId === loan.id ? "返却中..." : "返却"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/contact" className="underline">
          問い合わせフォーム
        </Link>
      </p>
    </main>
  );
}
