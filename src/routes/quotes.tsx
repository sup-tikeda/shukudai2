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
    <AppShell>
      <PageHeader
        title="見積・請求"
        subtitle="案件ごとに見積書・請求書を作成し、明細から金額を自動計算します。"
        actions={
          <button
            type="button"
            className={button({ size: "sm" })}
            disabled={caseOptions.length === 0}
            onClick={() => {
              setFormError(null);
              setModalOpen(true);
            }}
          >
            ＋ 新規作成
          </button>
        }
      />

      {caseOptions.length === 0 ? (
        <p className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          先に「案件」を登録してください。見積・請求は案件に紐づけて作成します。
        </p>
      ) : null}

      <Card title="見積・請求一覧" count={`${quotes.length} 件`}>
        {quotes.length === 0 ? (
          <EmptyState message="見積・請求が登録されていません。" />
        ) : (
          <RowList>
            {quotes.map((q) => (
              <Row
                key={q.id}
                actions={
                  <Link
                    to="/quotes/$id"
                    params={{ id: q.id }}
                    className={button({ variant: "outline", size: "sm" })}
                  >
                    詳細
                  </Link>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={docTypeTone(q.docType)}>{q.docType}</Badge>
                  <p className="font-medium break-words">
                    {q.title || "（タイトル未設定）"}
                  </p>
                </div>
                <p className="mt-0.5 text-sm text-ink-muted break-words">
                  {q.customerName} ／ {q.vehicleName} ／ {q.caseTitle}
                </p>
                <p className="mt-1 text-sm tabular-nums">
                  <span className="font-bold text-accent">
                    ¥{q.total.toLocaleString()}
                  </span>
                  <span className="text-ink-faint">
                    {" "}
                    （税抜 ¥{q.subtotal.toLocaleString()}／数量 {q.quantity}）
                    ／ 作成日 {q.createdOn}
                  </span>
                </p>
              </Row>
            ))}
          </RowList>
        )}
      </Card>

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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="docType"
              label="種別"
              options={quoteDocTypeValues.map((v) => ({ value: v, label: v }))}
              defaultValue="見積書"
            />
            <TextField name="taxRate" label="消費税率(%)" defaultValue="10" />
          </div>
          <TextField name="title" label="タイトル" />
          <TextField name="sentOn" label="送付日" type="date" />
          <TextField name="note" label="通信欄" multiline rows={3} />

          {formError ? (
            <p className="text-sm text-red-400" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "作成"}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
