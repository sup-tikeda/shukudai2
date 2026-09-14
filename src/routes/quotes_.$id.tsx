import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, TextField } from "~/components/ui/form";
import {
  quoteItemInputSchema,
  quoteItemUpdateInputSchema,
} from "~/lib/validation";
import {
  createQuoteItem,
  deleteQuote,
  deleteQuoteItem,
  getQuote,
  updateQuoteItem,
} from "~/server/quotes";

export const Route = createFileRoute("/quotes_/$id")({
  loader: ({ params }) => getQuote({ data: { id: params.id } }),
  component: QuoteDetailPage,
});

type QuoteDetail = Awaited<ReturnType<typeof getQuote>>;
type QuoteItemRow = QuoteDetail["items"][number];

function QuoteDetailPage() {
  const quote = Route.useLoaderData();
  const router = useRouter();
  const navigate = router.navigate;

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: QuoteItemRow } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function reload() {
    await router.invalidate();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      if (modal.mode === "create") {
        const parsed = quoteItemInputSchema.safeParse({
          ...formData,
          quoteId: quote.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createQuoteItem({ data: parsed.data });
      } else {
        const parsed = quoteItemUpdateInputSchema.safeParse({
          ...formData,
          id: modal.item.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateQuoteItem({ data: parsed.data });
      }

      setModal(null);
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

  async function handleDeleteItem(item: QuoteItemRow) {
    if (!window.confirm(`「${item.name}」を削除しますか？`)) return;
    setListError(null);
    try {
      await deleteQuoteItem({ data: { id: item.id } });
      await reload();
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  async function handleDeleteQuote() {
    if (
      !window.confirm(
        `この${quote.docType}を削除しますか？（明細項目もすべて削除されます）`,
      )
    ) {
      return;
    }
    try {
      await deleteQuote({ data: { id: quote.id } });
      await navigate({ to: "/quotes" });
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm">
            <Link to="/quotes" className="text-slate-500 underline">
              ← 見積・請求一覧へ
            </Link>
          </p>
          <h1 className="mt-1 text-xl font-bold">
            {quote.docType}
            {quote.title ? `：${quote.title}` : ""}
          </h1>
          <p className="text-sm text-slate-500">
            {quote.customerName} ／{" "}
            <Link to="/cases/$id" params={{ id: quote.caseId }} className="underline">
              {quote.caseTitle}
            </Link>{" "}
            ／ {quote.vehicleName}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDeleteQuote}
          className={button({ variant: "outline", size: "sm" })}
        >
          この{quote.docType}を削除
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">集計</h2>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-slate-500">数量</dt>
            <dd>{quote.summary.quantity}</dd>
          </div>
          <div>
            <dt className="text-slate-500">税抜合計</dt>
            <dd>{quote.summary.subtotal.toLocaleString()}円</dd>
          </div>
          <div>
            <dt className="text-slate-500">消費税額（{quote.taxRate}%）</dt>
            <dd>{quote.summary.tax.toLocaleString()}円</dd>
          </div>
          <div>
            <dt className="text-slate-500">税込合計</dt>
            <dd className="font-medium">
              {quote.summary.total.toLocaleString()}円
            </dd>
          </div>
        </dl>
        {quote.note ? (
          <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
            通信欄：{quote.note}
          </p>
        ) : null}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">明細項目（{quote.items.length} 件）</h2>
          <button
            type="button"
            className={button({ size: "sm" })}
            onClick={() => {
              setFormError(null);
              setModal({ mode: "create" });
            }}
          >
            項目を追加
          </button>
        </div>

        {listError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {listError}
          </p>
        ) : null}

        {quote.items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">明細項目はありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {quote.items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {item.quantity} 個 × {item.unitPrice.toLocaleString()}円 ={" "}
                    {(item.quantity * item.unitPrice).toLocaleString()}円
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={button({ variant: "outline", size: "sm" })}
                    onClick={() => {
                      setFormError(null);
                      setModal({ mode: "edit", item });
                    }}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className={button({ variant: "outline", size: "sm" })}
                    onClick={() => handleDeleteItem(item)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "明細項目を編集" : "明細項目を追加"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label="項目名"
            required
            defaultValue={modal?.mode === "edit" ? modal.item.name : ""}
          />
          <TextField
            name="quantity"
            label="数量"
            defaultValue={
              modal?.mode === "edit" ? String(modal.item.quantity) : "1"
            }
          />
          <TextField
            name="unitPrice"
            label="税抜単価"
            defaultValue={
              modal?.mode === "edit" ? String(modal.item.unitPrice) : "0"
            }
          />

          {formError ? (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "登録"}
          </button>
        </form>
      </Modal>
    </main>
  );
}
