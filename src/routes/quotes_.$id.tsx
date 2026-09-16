import { Fragment, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  DataTable,
  docTypeTone,
  PageHeader,
} from "~/components/ui/layout";
import {
  quoteDocTypeValues,
  quoteItemInputSchema,
  quoteItemUpdateInputSchema,
  quoteUpdateInputSchema,
} from "~/lib/validation";
import {
  convertQuoteToInvoice,
  createQuoteItem,
  deleteQuote,
  deleteQuoteItem,
  getQuote,
  updateQuote,
  updateQuoteItem,
} from "~/server/quotes";
import { listWorkItemOptions } from "~/server/work-items";

export const Route = createFileRoute("/quotes_/$id")({
  loader: async ({ params }) => {
    const [quote, workItemOptions] = await Promise.all([
      getQuote({ data: { id: params.id } }),
      listWorkItemOptions(),
    ]);
    return { quote, workItemOptions };
  },
  component: QuoteDetailPage,
});

type QuoteDetail = Awaited<ReturnType<typeof getQuote>>;
type QuoteItemRow = QuoteDetail["items"][number];

/** 金額表示。割引の明細はマイナスになるため、記号は「¥」の前に出す（¥-200 ではなく -¥200） */
function yen(value: number) {
  return `${value < 0 ? "-" : ""}¥${Math.abs(value).toLocaleString()}`;
}

function QuoteDetailPage() {
  const { quote, workItemOptions } = Route.useLoaderData();
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

    // 作業マスタで「割引」を選んだ明細は、入力された金額をマイナスにして保存する。
    // マスタの金額は既定値にすぎないため、手で直した金額にも同じように符号を付ける。
    const selectedWorkItem = workItemOptions.find(
      (w) => w.id === formData.workItemId,
    );
    const entered = Number(formData.unitPrice);
    const values =
      selectedWorkItem?.itemType === "割引" && Number.isFinite(entered)
        ? { ...formData, unitPrice: -Math.abs(entered) }
        : formData;

    setFormError(null);
    setPending(true);
    try {
      if (modal.mode === "create") {
        const parsed = quoteItemInputSchema.safeParse({
          ...values,
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
          ...values,
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

  /** 見積書から請求書を起こす。元の見積書は証跡として残す */
  async function handleConvert() {
    if (
      !window.confirm(
        "この見積書をもとに請求書を作成しますか？（見積書はそのまま残ります）",
      )
    ) {
      return;
    }
    setListError(null);
    try {
      const created = await convertQuoteToInvoice({ data: { id: quote.id } });
      await router.navigate({ to: "/quotes/$id", params: { id: created.id } });
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : "請求書の作成に失敗しました。",
      );
    }
  }

  return (
    <AppShell>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {quote.title || "（タイトル未設定）"}
            <Badge tone={docTypeTone(quote.docType)}>{quote.docType}</Badge>
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
            {/* 見積書と請求書の対応関係。金額の根拠を後からたどれるようにする */}
            {quote.sourceQuoteId && quote.sourceDocNumber ? (
              <>
                <br />
                元の見積書：
                <Link
                  to="/quotes/$id"
                  params={{ id: quote.sourceQuoteId }}
                  className="text-accent underline underline-offset-4"
                >
                  No. {String(quote.sourceDocNumber).padStart(6, "0")}
                </Link>
              </>
            ) : null}
            {quote.convertedInvoices.length > 0 ? (
              <>
                <br />
                この見積から作成した請求書：
                {quote.convertedInvoices.map((invoice, index) => (
                  <Fragment key={invoice.id}>
                    {index > 0 ? "、" : null}
                    <Link
                      to="/quotes/$id"
                      params={{ id: invoice.id }}
                      className="text-accent underline underline-offset-4"
                    >
                      No. {String(invoice.docNumber).padStart(6, "0")}
                    </Link>
                  </Fragment>
                ))}
              </>
            ) : null}
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
            {/* 見積書のときだけ。請求書から請求書は作らない */}
            {quote.docType === "見積書" ? (
              <button
                type="button"
                onClick={handleConvert}
                className={button({ variant: "outline", size: "sm" })}
              >
                請求書を作成
              </button>
            ) : null}
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
              消費税
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              ¥{quote.summary.tax.toLocaleString()}
            </p>
            {/* 税率が複数あるときだけ内訳を出す（1種類ならくどくなるため） */}
            {quote.summary.taxes.length > 1 ? (
              <p className="mt-0.5 text-xs text-ink-faint tabular-nums">
                {quote.summary.taxes
                  .map((row) => `${row.rate}% ¥${row.tax.toLocaleString()}`)
                  .join(" ／ ")}
              </p>
            ) : null}
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
        {/* 社内メモは帳票に印字されない。客先に出ないことが分かるよう明記する */}
        {quote.internalNote ? (
          <p className="border-t border-line px-5 py-3 text-sm text-ink-muted whitespace-pre-wrap">
            <span className="font-bold text-ink-faint">
              社内メモ（帳票には出ません）：
            </span>
            {quote.internalNote}
          </p>
        ) : null}
      </div>

      {listError ? (
        <p className="mt-4 text-sm text-danger" role="alert">
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
          <DataTable
            rows={quote.items}
            rowKey={(item) => item.id}
            emptyMessage="明細項目がありません。「＋ 項目を追加」から登録してください。"
            columns={[
              {
                key: "name",
                header: "項目名",
                width: "min-w-[10rem]",
                render: (item: QuoteItemRow) => (
                  <p className="font-medium break-words">{item.name}</p>
                ),
              },
              {
                key: "quantity",
                header: "数量",
                align: "right",
                render: (item: QuoteItemRow) => (
                  <span className="tabular-nums">{item.quantity}</span>
                ),
              },
              {
                key: "unitPrice",
                header: "単価",
                align: "right",
                render: (item: QuoteItemRow) => (
                  <span className="whitespace-nowrap tabular-nums">
                    {yen(item.unitPrice)}
                  </span>
                ),
              },
              {
                key: "taxRate",
                header: "税率",
                align: "center",
                render: (item: QuoteItemRow) => (
                  <span className="whitespace-nowrap text-ink-faint tabular-nums">
                    {item.taxRate}%
                  </span>
                ),
              },
              {
                key: "subtotal",
                header: "小計",
                align: "right",
                render: (item: QuoteItemRow) => (
                  <span className="whitespace-nowrap font-bold tabular-nums">
                    {yen(item.quantity * item.unitPrice)}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (item: QuoteItemRow) => (
                  <div className="flex justify-end gap-2 whitespace-nowrap">
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
                  </div>
                ),
              },
            ]}
          />
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
              label="明細の既定の消費税率(%)"
              defaultValue={String(quote.taxRate)}
            />
          </div>
          <TextField
            name="title"
            label="タイトル"
            defaultValue={quote.title ?? ""}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 月末締めで前月日付の請求書を出すことがあるため、発行日は後から直せる */}
            <TextField
              name="createdOn"
              label="発行日"
              type="date"
              defaultValue={quote.createdOn}
            />
            <TextField
              name="sentOn"
              label="送付日"
              type="date"
              defaultValue={quote.sentOn ?? ""}
            />
          </div>
          <TextField
            name="note"
            label="通信欄（帳票に印字されます）"
            multiline
            rows={3}
            defaultValue={quote.note ?? ""}
          />
          <TextField
            name="internalNote"
            label="社内メモ（帳票には出ません）"
            multiline
            rows={3}
            defaultValue={quote.internalNote ?? ""}
          />

          {headerError ? (
            <p className="text-sm text-danger" role="alert">
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
        <QuoteItemForm
          item={modal?.mode === "edit" ? modal.item : undefined}
          workItemOptions={workItemOptions}
          defaultTaxRate={quote.taxRate}
          pending={pending}
          formError={formError}
          onSubmit={handleSubmit}
        />
      </Modal>
    </AppShell>
  );
}

type LoaderData = ReturnType<typeof Route.useLoaderData>;
type WorkItemOption = LoaderData["workItemOptions"][number];

/** 明細の「項目名」欄で、リストに無い項目を自由入力するときの選択値 */
const CUSTOM_WORK_ITEM = "__custom__";

/**
 * 明細項目の追加・編集フォーム。
 *
 * 項目名は作業マスタから選ぶ形にし、表記ゆれと単価・税率の入力の手間を減らす。
 * マスタに無い項目は「その他（自由入力）」を選んで直接名前を書ける。
 * 編集時、既存の名前がマスタの項目と一致すればその項目が選ばれた状態で開き、
 * 一致しなければ「その他」として名前をそのまま自由入力欄に表示する
 * （マスタ側の名前が変わった・削除された後でも、既存の明細の表示は変わらない）。
 */
function QuoteItemForm({
  item,
  workItemOptions,
  defaultTaxRate,
  pending,
  formError,
  onSubmit,
}: {
  item?: QuoteItemRow;
  workItemOptions: WorkItemOption[];
  defaultTaxRate: number;
  pending: boolean;
  formError: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const matchedWorkItem = item
    ? workItemOptions.find((w) => w.name === item.name)
    : undefined;

  const initialWorkItemId = matchedWorkItem
    ? matchedWorkItem.id
    : CUSTOM_WORK_ITEM;
  const [workItemId, setWorkItemId] = useState(initialWorkItemId);
  const isCustom = workItemId === CUSTOM_WORK_ITEM;
  const selectedWorkItem = workItemOptions.find((w) => w.id === workItemId);
  const isDiscount = selectedWorkItem?.itemType === "割引";

  // 数量・単価・税率の入力欄は非制御のまま、workItemId を key に含めて
  // 項目を選び直した時だけ既定値を入れ直す。
  // 作業マスタの金額はあくまで既定値なので、編集で開いた直後は
  // 保存されている金額（手で直した金額）をそのまま出す。
  const reselected = workItemId !== initialWorkItemId;
  const priceDefault =
    reselected || !item
      ? String(selectedWorkItem?.unitPrice ?? item?.unitPrice ?? 0)
      : // 割引の明細はマイナスで保存しているが、入力欄には割引額（プラス）で見せる
        String(isDiscount ? Math.abs(item.unitPrice) : item.unitPrice);
  const taxRateDefault =
    reselected || !item
      ? String(selectedWorkItem?.taxRate ?? item?.taxRate ?? defaultTaxRate)
      : String(item.taxRate);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SelectField
        name="workItemId"
        label="項目名"
        options={[
          ...workItemOptions.map((w) => ({ value: w.id, label: w.name })),
          { value: CUSTOM_WORK_ITEM, label: "その他（自由入力）" },
        ]}
        value={workItemId}
        onChange={setWorkItemId}
      />
      {isCustom ? (
        <TextField
          key={`name-${workItemId}`}
          name="name"
          label="項目名（自由入力）"
          required
          defaultValue={!matchedWorkItem ? (item?.name ?? "") : ""}
        />
      ) : (
        // マスタから選んでいる間は、実際に保存する名前をこの隠しフィールドで送る
        <input type="hidden" name="name" value={selectedWorkItem?.name ?? ""} />
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          name="quantity"
          label="数量"
          defaultValue={String(item?.quantity ?? 1)}
        />
        <TextField
          key={`unitPrice-${workItemId}`}
          name="unitPrice"
          label={isDiscount ? "割引額（税抜）" : "税抜単価"}
          defaultValue={priceDefault}
        />
      </div>
      {isDiscount ? (
        <p className="text-xs text-ink-faint">
          割引の項目です。ここに入れた金額が合計から差し引かれます。
        </p>
      ) : null}
      {/* 軽減税率の品目が混ざる場合に備え、明細ごとに税率を持たせている */}
      <TextField
        key={`taxRate-${workItemId}`}
        name="taxRate"
        label="消費税率(%)"
        defaultValue={taxRateDefault}
      />

      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <button type="submit" className={button()} disabled={pending}>
        {pending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
