import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";
import { quoteDocTypeValues, quoteInputSchema } from "~/lib/validation";
import { listCaseOptions } from "~/server/cases";
import { createQuote, listQuotes } from "~/server/quotes";

export const Route = createFileRoute("/quotes")({
  loader: async () => ({
    quotes: await listQuotes(),
    caseOptions: await listCaseOptions(),
  }),
  component: QuotesPage,
});

function QuotesPage() {
  const { quotes, caseOptions } = Route.useLoaderData();
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function reload() {
    await router.invalidate();
  }

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/login" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      const parsed = quoteInputSchema.safeParse(formData);
      if (!parsed.success) {
        setFormError(
          parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
        );
        return;
      }
      await createQuote({ data: parsed.data });
      setModalOpen(false);
      await reload();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setPending(false);
    }
  }

  const caseSelectOptions = caseOptions.map((c) => ({
    value: c.id,
    label: `${c.title}（${c.vehicleName}）`,
  }));

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm">
            <Link to="/" className="text-slate-500 underline">
              ← ダッシュボードへ
            </Link>
          </p>
          <h1 className="text-xl font-bold">見積・請求</h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={button({ variant: "outline", size: "sm" })}
        >
          ログアウト
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">一覧（{quotes.length} 件）</h2>
          <button
            type="button"
            className={button({ size: "sm" })}
            disabled={caseOptions.length === 0}
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
          >
            新規作成
          </button>
        </div>

        {caseOptions.length === 0 ? (
          <p className="mt-2 text-sm text-amber-600">
            先に「案件」を登録してください。
          </p>
        ) : null}

        {quotes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">
            見積・請求が登録されていません。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {quotes.map((q) => (
              <li
                key={q.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">
                    {q.docType}
                    {q.title ? `：${q.title}` : ""}
                  </p>
                  <p className="text-sm text-slate-500">
                    {q.customerName} ／ {q.vehicleName} ／ {q.caseTitle}
                  </p>
                  <p className="text-sm text-slate-500">
                    数量 {q.quantity} ／ 税込合計 {q.total.toLocaleString()}円 ／
                    作成日 {q.createdOn}
                  </p>
                </div>
                <Link
                  to="/quotes/$id"
                  params={{ id: q.id }}
                  className={button({ variant: "outline", size: "sm" })}
                >
                  詳細
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="見積・請求を新規作成"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            name="caseId"
            label="対象案件"
            options={caseSelectOptions}
            defaultValue={caseSelectOptions[0]?.value}
          />
          <SelectField
            name="docType"
            label="種別"
            options={quoteDocTypeValues.map((v) => ({ value: v, label: v }))}
            defaultValue="見積書"
          />
          <TextField name="title" label="タイトル" />
          <TextField name="taxRate" label="消費税率（%）" defaultValue="10" />
          <TextField name="sentOn" label="送付日" type="date" />
          <TextField name="note" label="通信欄" multiline rows={3} />

          {formError ? (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "作成"}
          </button>
        </form>
      </Modal>
    </main>
  );
}
