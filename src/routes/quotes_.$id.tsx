import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  docTypeTone,
  EmptyState,
  PageHeader,
  Row,
  RowList,
} from "~/components/ui/layout";
import {
  quoteDocTypeValues,
  quoteItemInputSchema,
  quoteItemUpdateInputSchema,
  quoteUpdateInputSchema,
} from "~/lib/validation";
import {
  createQuoteItem,
  deleteQuote,
  deleteQuoteItem,
  getQuote,
  updateQuote,
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

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: QuoteItemRow } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [headerOpen, setHeaderOpen] = useState(false);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [headerPending, setHeaderPending] = useState(false);

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

  /** 種別・タイトル・税率・送付日・通信欄をあとから直す */
  async function handleHeaderSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setHeaderError(null);
    setHeaderPending(true);
    try {
      const parsed = quoteUpdateInputSchema.safeParse({
        ...formData,
        id: quote.id,
        caseId: quote.caseId,
      });
      if (!parsed.success) {
        setHeaderError(
          parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
        );
        return;
      }
      await updateQuote({ data: parsed.data });
      setHeaderOpen(false);
      await reload();
    } catch (error) {
      setHeaderError(
        error instanceof Error
          ? error.message
          : "保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setHeaderPending(false);
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
      await router.navigate({ to: "/quotes" });
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Badge tone={docTypeTone(quote.docType)}>{quote.docType}</Badge>
            {quote.title || "（タイトル未設定）"}
          </span>
        }
        backTo="/quotes"
        backLabel="見積・請求一覧"
        subtitle={
          <>
            No. {String(quote.docNumber).padStart(6, "0")} ／{" "}
            {quote.customerName} ／{" "}
            <Link
              to="/cases/$id"
              params={{ id: quote.caseId }}
              className="text-accent underline underline-offset-4"
            >
              {quote.caseTitle}
            </Link>{" "}
            ／ {quote.vehicleName}
          </>
        }
        actions={
          <>
            <Link
              to="/quotes/$id/print"
              params={{ id: quote.id }}
              className={button({ size: "sm" })}
            >
              印刷 / PDF
            </Link>
            <button
              type="button"
              onClick={() => {
                setHeaderError(null);
                setHeaderOpen(true);
              }}
              className={button({ variant: "outline", size: "sm" })}
            >
              編集
            </button>
            <button
              type="button"
              onClick={handleDeleteQuote}
              className={button({ variant: "danger", size: "sm" })}
            >
              削除
            </button>
          </>
        }
      />

      {/* 金額のまとめ。明細を変えると自動で計算し直される（DBには保存していない） */}
      <div className="rounded-xl border border-line bg-surface">
        <div className="grid grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          <div className="px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              数量
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {quote.summary.quantity}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              税抜合計
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              ¥{quote.summary.subtotal.toLocaleString()}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-ink-faint uppercase">
              消費税（{quote.taxRate}%）
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              ¥{quote.summary.tax.toLocaleString()}
            </p>
          </div>
          <div className="bg-accent/10 px-5 py-4">
            <p className="text-xs font-medium tracking-wide text-accent uppercase">
              税込合計
            </p>
            <p className="mt-1 text-xl font-bold text-accent tabular-nums">
              ¥{quote.summary.total.toLocaleString()}
            </p>
          </div>
        </div>
        {quote.note ? (
          <p className="border-t border-line px-5 py-3 text-sm text-ink-muted whitespace-pre-wrap">
            通信欄：{quote.note}
          </p>
        ) : null}
      </div>

      {listError ? (
        <p className="mt-4 text-sm text-red-400" role="alert">
          {listError}
        </p>
      ) : null}

      <div className="mt-6">
        <Card
          title="明細項目"
          count={`${quote.items.length} 件`}
          actions={
            <button
              type="button"
              className={button({ size: "sm" })}
              onClick={() => {
                setFormError(null);
                setModal({ mode: "create" });
              }}
            >
              ＋ 項目を追加
            </button>
          }
        >
          {quote.items.length === 0 ? (
            <EmptyState message="明細項目がありません。「＋ 項目を追加」から登録してください。" />
          ) : (
            <RowList>
              {quote.items.map((item) => (
                <Row
                  key={item.id}
                  actions={
                    <>
                      <button
                        type="button"
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={() => {
                          setFormError(null);
                          setModal({ mode: "edit", item });
                        }}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={() => handleDeleteItem(item)}
                      >
                        削除
                      </button>
                    </>
                  }
                >
                  <p className="font-medium break-words">{item.name}</p>
                  <p className="mt-0.5 text-sm text-ink-muted tabular-nums">
                    {item.quantity} × ¥{item.unitPrice.toLocaleString()} ={" "}
                    <span className="text-ink">
                      ¥{(item.quantity * item.unitPrice).toLocaleString()}
                    </span>
                  </p>
                </Row>
              ))}
            </RowList>
          )}
        </Card>
      </div>

      <Modal
        open={headerOpen}
        onOpenChange={setHeaderOpen}
        title={`${quote.docType}の内容を編集`}
      >
        <form onSubmit={handleHeaderSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="docType"
              label="種別"
              options={quoteDocTypeValues.map((v) => ({ value: v, label: v }))}
              defaultValue={quote.docType}
            />
            <TextField
              name="taxRate"
              label="消費税率(%)"
              defaultValue={String(quote.taxRate)}
            />
          </div>
          <TextField
            name="title"
            label="タイトル"
            defaultValue={quote.title ?? ""}
          />
          <TextField
            name="sentOn"
            label="送付日"
            type="date"
            defaultValue={quote.sentOn ?? ""}
          />
          <TextField
            name="note"
            label="通信欄"
            multiline
            rows={3}
            defaultValue={quote.note ?? ""}
          />

          {headerError ? (
            <p className="text-sm text-red-400" role="alert">
              {headerError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={headerPending}>
            {headerPending ? "保存中..." : "保存"}
          </button>
        </form>
      </Modal>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          {formError ? (
            <p className="text-sm text-red-400" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
