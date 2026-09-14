import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
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
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <p className="text-sm">
        <Link to="/cases" className="text-slate-500 underline">
          ← 案件一覧へ
        </Link>
      </p>
      <h1 className="mt-1 text-xl font-bold">{item.title}</h1>
      <p className="text-sm text-slate-500">
        {item.customerName} ／{" "}
        <Link to="/vehicles/$id" params={{ id: item.vehicleId }} className="underline">
          {item.vehicleName}
        </Link>
      </p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">案件情報</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">ステータス</dt>
            <dd>{item.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">担当者</dt>
            <dd>{item.assignee || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">開始予定日</dt>
            <dd>{item.plannedStartOn || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">終了予定日</dt>
            <dd>{item.plannedEndOn || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">案件：内容</dt>
            <dd className="whitespace-pre-wrap">{item.content || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">作業：内容</dt>
            <dd className="whitespace-pre-wrap">{item.workContent || "-"}</dd>
          </div>
          {item.note ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">備考</dt>
              <dd className="whitespace-pre-wrap">{item.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-medium">見積・請求（{quotes.length} 件）</h2>
          <Link to="/quotes" className={button({ variant: "outline", size: "sm" })}>
            見積・請求を作成
          </Link>
        </div>

        {quotes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">見積・請求はありません。</p>
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
                    税込合計 {q.total.toLocaleString()}円 ／ 作成日 {q.createdOn}
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
    </main>
  );
}
