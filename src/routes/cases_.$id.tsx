import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  DataTable,
  DetailItem,
  DetailList,
  docTypeTone,
  PageHeader,
  RemainingDaysLabel,
  statusTone,
} from "~/components/ui/layout";
import { getCase } from "~/server/cases";
import { listQuotes } from "~/server/quotes";

export const Route = createFileRoute("/cases_/$id")({
  loader: async ({ params }) => {
    const item = await getCase({ data: { id: params.id } });
    const allQuotes = await listQuotes();
    return {
      item,
      quotes: allQuotes.filter((q) => q.caseId === params.id),
    };
  },
  component: CaseDetailPage,
});

type QuoteRow = ReturnType<typeof Route.useLoaderData>["quotes"][number];

function CaseDetailPage() {
  const { item, quotes } = Route.useLoaderData();

  return (
    <AppShell>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {item.title}
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
          </span>
        }
        backTo="/cases"
        backLabel="案件一覧"
        subtitle={
          <>
            No. {String(item.caseNumber).padStart(6, "0")} ／{" "}
            {item.customerName} ／{" "}
            <Link
              to="/vehicles/$id"
              params={{ id: item.vehicleId }}
              className="text-accent underline underline-offset-4"
            >
              {item.vehicleName}
            </Link>
          </>
        }
      />

      <Card title="案件情報">
        <DetailList>
          <DetailItem label="担当者">{item.assignee}</DetailItem>
          <DetailItem label="ステータス">{item.status}</DetailItem>
          <DetailItem label="開始予定日">{item.plannedStartOn}</DetailItem>
          <DetailItem label="終了予定日">
            {item.plannedEndOn ? (
              <>
                {item.plannedEndOn}
                {item.status !== "完了済み" ? (
                  <RemainingDaysLabel endOn={item.plannedEndOn} />
                ) : null}
              </>
            ) : null}
          </DetailItem>
          <DetailItem label="案件内容" wide>
            {item.content}
          </DetailItem>
          <DetailItem label="作業内容" wide>
            {item.workContent}
          </DetailItem>
          <DetailItem label="備考" wide>
            {item.note}
          </DetailItem>
        </DetailList>
      </Card>

      <div className="mt-6">
        <Card
          title="見積・請求"
          count={`${quotes.length} 件`}
          actions={
            <Link
              to="/quotes"
              search={{ new: item.id }}
              className={button({ variant: "outline", size: "sm" })}
            >
              ＋ 見積・請求を作成
            </Link>
          }
        >
          <DataTable
            rows={quotes}
            rowKey={(q) => q.id}
            emptyMessage="この案件の見積・請求はまだありません。"
            columns={[
              {
                key: "docType",
                header: "種別",
                render: (q: QuoteRow) => (
                  <Badge tone={docTypeTone(q.docType)}>{q.docType}</Badge>
                ),
              },
              {
                key: "title",
                header: "タイトル",
                width: "min-w-[10rem]",
                render: (q: QuoteRow) => (
                  <p className="font-medium break-words">
                    {q.title || (
                      <span className="text-ink-faint">
                        （タイトル未設定）
                      </span>
                    )}
                  </p>
                ),
              },
              {
                key: "total",
                header: "金額（税込）",
                align: "right",
                render: (q: QuoteRow) => (
                  <span className="whitespace-nowrap font-bold text-accent tabular-nums">
                    ¥{q.total.toLocaleString()}
                  </span>
                ),
              },
              {
                key: "createdOn",
                header: "作成日",
                render: (q: QuoteRow) => (
                  <span className="whitespace-nowrap tabular-nums">
                    {q.createdOn}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (q: QuoteRow) => (
                  <Link
                    to="/quotes/$id"
                    params={{ id: q.id }}
                    className={button({ variant: "outline", size: "sm" })}
                  >
                    詳細
                  </Link>
                ),
              },
            ]}
          />
        </Card>
      </div>
    </AppShell>
  );
}
