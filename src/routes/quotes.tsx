import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  DataTable,
  docTypeTone,
  ListToolbar,
  matchesQuery,
  PageHeader,
  vehicleLabel,
} from "~/components/ui/layout";
import { quoteDocTypeValues, quoteInputSchema } from "~/lib/validation";
import { listCaseOptions } from "~/server/cases";
import { createQuote, listQuotes } from "~/server/quotes";
import { getDefaultTaxRate } from "~/server/shopSettings";

export const Route = createFileRoute("/quotes")({
  // 案件詳細から «＋ 見積・請求を作成» で来た時、その案件を選んだ状態でフォームを開くため
  // 戻り値を任意項目にしておく（付けずにこの画面へ来るリンクも成り立たせるため）
  validateSearch: (search: Record<string, unknown>): { new?: string } =>
    typeof search.new === "string" ? { new: search.new } : {},
  loader: async () => ({
    quotes: await listQuotes(),
    // 案件詳細の「＋」から来た時に、その案件の顧客・車両を表示するために使う
    // （見積・請求は必ず既存の案件に対して作るため、単独の選択肢一覧としては使わない）
    caseOptions: await listCaseOptions(),
    defaultTaxRate: await getDefaultTaxRate(),
  }),
  component: QuotesPage,
});

function QuotesPage() {
  const { quotes, caseOptions, defaultTaxRate } = Route.useLoaderData();
  const { new: presetCaseId } = Route.useSearch();
  const presetCase = caseOptions.find((c) => c.id === presetCaseId);
  const router = useRouter();

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("newest");

  // 案件詳細から遷移してきた場合は、その案件を選んだ状態で作成フォームを開く
  useEffect(() => {
    if (presetCaseId) {
      setModalOpen(true);
    }
  }, [presetCaseId]);

  const visibleQuotes = quotes
    .filter((q) =>
      matchesQuery(query, [
        q.title,
        q.docType,
        q.customerName,
        q.vehicleName,
        q.caseTitle,
        String(q.docNumber),
      ]),
    )
    .sort((a, b) => {
      if (sortKey === "amount") return b.total - a.total;
      if (sortKey === "number") return a.docNumber - b.docNumber;
      return b.createdOn.localeCompare(a.createdOn);
    });

  async function reload() {
    await router.invalidate();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!presetCaseId) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      const parsed = quoteInputSchema.safeParse({
        ...formData,
        caseId: presetCaseId,
      });
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

  return (
    // 見出しと絞り込みは固定し、一覧の中だけをスクロールさせる
    <AppShell fill>
      <PageHeader
        eyebrow="Quotes"
        title="見積・請求"
        subtitle="案件ごとに見積書・請求書を作成し、明細から金額を自動計算します。新規作成は案件の詳細画面から行います。"
        actions={
          <Link to="/cases" className={button({ variant: "outline", size: "sm" })}>
            案件一覧へ
          </Link>
        }
      />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="タイトル・顧客・車両・案件・管理番号で絞り込み"
        sortKey={sortKey}
        onSortChange={setSortKey}
        sortOptions={[
          { value: "newest", label: "作成日が新しい順" },
          { value: "amount", label: "金額が大きい順" },
          { value: "number", label: "管理番号順" },
        ]}
      />

      {/* 一覧は残りの高さいっぱいに広げ、中身だけをスクロールさせる */}
      <Card
        fill
        title="見積・請求一覧"
        count={
          query
            ? `${visibleQuotes.length} / ${quotes.length} 件`
            : `${quotes.length} 件`
        }
      >
        <DataTable
          rows={visibleQuotes}
          rowKey={(q) => q.id}
          emptyMessage={
            quotes.length === 0
              ? "見積・請求が登録されていません。"
              : "条件に合う見積・請求が見つかりませんでした。"
          }
          columns={[
            {
              key: "docNumber",
              header: "管理番号",
              render: (q) => (
                <span className="whitespace-nowrap text-ink-faint tabular-nums">
                  {String(q.docNumber).padStart(6, "0")}
                </span>
              ),
            },
            {
              key: "title",
              header: "タイトル",
              // タイトルは短いこともあるので余白は吸わせず、下限だけ決める
              width: "min-w-[10rem]",
              render: (q) => (
                <p className="font-medium break-words">
                  {q.title || (
                    <span className="text-ink-faint">（タイトル未設定）</span>
                  )}
                </p>
              ),
            },
            {
              key: "docType",
              header: "種別",
              render: (q) => (
                <Badge tone={docTypeTone(q.docType)}>{q.docType}</Badge>
              ),
            },
            {
              key: "target",
              header: "顧客・車両",
              render: (q) => (
                <>
                  <p className="break-words">{q.customerName}</p>
                  <p className="mt-0.5 text-xs text-ink-faint break-words">
                    {q.vehicleName}
                  </p>
                </>
              ),
            },
            {
              key: "total",
              header: "金額（税込）",
              align: "right",
              render: (q) => (
                <>
                  <p className="font-bold whitespace-nowrap text-accent tabular-nums">
                    ¥{q.total.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs whitespace-nowrap text-ink-faint tabular-nums">
                    税抜 ¥{q.subtotal.toLocaleString()}
                  </p>
                </>
              ),
            },
            {
              key: "createdOn",
              header: "発行日",
              render: (q) => (
                <span className="whitespace-nowrap tabular-nums">
                  {q.createdOn}
                </span>
              ),
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (q) => (
                <div className="flex justify-end gap-2 whitespace-nowrap">
                  <Link
                    to="/quotes/$id"
                    params={{ id: q.id }}
                    className={button({ variant: "outline", size: "sm" })}
                  >
                    詳細
                  </Link>
                  <Link
                    to="/quotes/$id/print"
                    params={{ id: q.id }}
                    className={button({ variant: "ghost", size: "sm" })}
                  >
                    印刷
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="見積・請求を新規作成"
      >
        <QuoteCreateForm
          presetCase={presetCase}
          defaultTaxRate={defaultTaxRate}
          pending={pending}
          formError={formError}
          onSubmit={handleSubmit}
        />
      </Modal>
    </AppShell>
  );
}

type LoaderData = ReturnType<typeof Route.useLoaderData>;
type CaseOption = LoaderData["caseOptions"][number];

/**
 * 見積・請求の新規作成フォーム。
 *
 * 見積・請求は必ず既存の案件に対して作る（案件詳細の「＋見積・請求を作成」から
 * しか開けない）。対象の案件・顧客・車両はここでは選ばせず、確認用に表示するだけにする。
 */
function QuoteCreateForm({
  presetCase,
  defaultTaxRate,
  pending,
  formError,
  onSubmit,
}: {
  presetCase?: CaseOption;
  defaultTaxRate: number;
  pending: boolean;
  formError: string | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!presetCase) {
    // 見積・請求は案件詳細の「＋」からしか作れないため、通常はここに来ない
    return (
      <p className="text-sm text-ink-faint">
        見積・請求は、対象の案件の詳細画面にある「＋見積・請求を作成」から作成してください。
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FixedValue
        label="対象案件"
        value={`${presetCase.title}（No.${String(
          presetCase.caseNumber,
        ).padStart(6, "0")}）`}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FixedValue label="顧客" value={presetCase.customerName} />
        <FixedValue
          label="車両"
          value={vehicleLabel({
            modelName: presetCase.vehicleName,
            vehicleNumber: presetCase.vehicleNumber,
          })}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField
          name="docType"
          label="種別"
          options={quoteDocTypeValues.map((v) => ({ value: v, label: v }))}
          defaultValue="見積書"
        />
        <TextField
          name="taxRate"
          label="明細の既定の消費税率(%)"
          defaultValue={String(defaultTaxRate)}
        />
      </div>
      <TextField name="title" label="タイトル" />
      <TextField name="sentOn" label="送付日" type="date" />
      <TextField
        name="note"
        label="通信欄（帳票に印字されます）"
        multiline
        rows={3}
      />
      <TextField
        name="internalNote"
        label="社内メモ（帳票には出ません）"
        multiline
        rows={3}
      />

      {formError ? (
        <p className="text-sm text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <button type="submit" className={button()} disabled={pending}>
        {pending ? "保存中..." : "作成"}
      </button>
    </form>
  );
}

/** 変更できない項目。入力欄と同じ体裁で並べて、選んだ相手を確認できるようにする。 */
function FixedValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
        {label}
      </p>
      <p className="rounded-md border border-line bg-surface-raised px-3 py-2 text-sm">
        {value}
      </p>
    </div>
  );
}
