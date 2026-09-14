import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  DetailItem,
  DetailList,
  docTypeTone,
  EmptyState,
  PageHeader,
  Row,
  RowList,
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
          <DetailItem label="終了予定日">{item.plannedEndOn}</DetailItem>
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
              className={button({ variant: "outline", size: "sm" })}
            >
              見積・請求を作成
            </Link>
          }
        >
          {quotes.length === 0 ? (
            <EmptyState message="この案件の見積・請求はまだありません。" />
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
                  <p className="mt-0.5 text-sm text-ink-muted tabular-nums">
                    税込 ¥{q.total.toLocaleString()} ／ 作成日 {q.createdOn}
                  </p>
                </Row>
              ))}
            </RowList>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
