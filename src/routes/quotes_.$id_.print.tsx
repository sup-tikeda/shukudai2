import { createFileRoute, Link } from "@tanstack/react-router";
import { QuoteDocument } from "~/components/documents/quote-document";
import { button } from "~/components/ui/form";
import { getQuoteForPrint } from "~/server/quotes";

export const Route = createFileRoute("/quotes_/$id_/print")({
  loader: ({ params }) => getQuoteForPrint({ data: { id: params.id } }),
  component: QuotePrintPage,
});

function QuotePrintPage() {
  const data = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      {/* 操作バー。印刷・PDF出力時は出さない */}
      <div className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <Link
          to="/quotes/$id"
          params={{ id: data.quote.id }}
          className="text-sm text-neutral-700 underline underline-offset-4 hover:text-neutral-900"
        >
          ← 見積・請求の詳細へ戻る
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className={button({ size: "sm" })}
        >
          印刷 / PDFとして保存
        </button>
      </div>

      {!data.shop?.companyName ? (
        <p className="mx-auto mb-4 max-w-[210mm] rounded-md border border-amber-500 bg-amber-100 px-4 py-2 text-sm text-amber-900 print:hidden">
          会社名が未設定です。マスタ画面の「会社設定」で登録すると、帳票の発行元欄に印字されます。
        </p>
      ) : null}

      {/*
        帳票はA4の幅（210mm≒794px）で組んであり、スマホの画面幅には収まらない。
        ページ全体が横スクロールすると操作バーごと流れてしまうため、
        帳票だけを横スクロールの箱に入れて、画面の外へはみ出さないようにする。
        印刷時はこの箱を無効にして、用紙どおりに出力する。
      */}
      <div className="overflow-x-auto px-4 print:overflow-visible print:px-0">
        <div className="mx-auto w-[210mm] max-w-[210mm] shadow-lg print:shadow-none">
          <QuoteDocument {...data} />
        </div>
      </div>

      <p className="mx-auto mt-3 max-w-[210mm] px-4 text-center text-xs text-neutral-600 md:hidden print:hidden">
        帳票はA4の幅で作られています。スマホでは横にスクロールしてご覧ください。
      </p>

      <p className="mx-auto mt-4 max-w-[210mm] px-4 text-center text-xs text-neutral-600 print:hidden">
        ブラウザの印刷画面で「送信先」を「PDFに保存」にするとPDFファイルとして保存できます。
      </p>
    </div>
  );
}
