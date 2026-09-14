import type { getQuoteForPrint } from "~/server/quotes";

type PrintData = Awaited<ReturnType<typeof getQuoteForPrint>>;

/**
 * 見積書・請求書の帳票テンプレート。
 *
 * 元の FileMaker「見積・請求_印刷」レイアウトの構成を踏襲している
 * （発行元ヘッダ → 宛名 → 合計金額 → 明細表 → 振込先 → 通信欄）。
 * 種別（見積書／請求書）で文言と振込先の有無だけが変わり、体裁は共通。
 *
 * 画面はダークテーマだが、この帳票だけは紙に出す前提で白地・黒文字にしている。
 * 出力は専用ライブラリを使わず、ブラウザの印刷機能（PDFとして保存）を利用する。
 */
export function QuoteDocument({ quote, items, summary, shop }: PrintData) {
  const isInvoice = quote.docType === "請求書";
  // 元レイアウトの「用紙_文言」と同じ出し分け
  const leadText = isInvoice
    ? "下記の通りご請求申し上げます"
    : "お見積もり内容は以下になります";
  const totalLabel = isInvoice ? "御請求金額" : "御見積金額";

  const customerAddress = [
    quote.customerAddress,
    quote.customerAddressLine2,
    quote.customerBuilding,
  ]
    .filter(Boolean)
    .join(" ");

  const shopAddress = [shop?.address, shop?.building].filter(Boolean).join(" ");

  return (
    <article className="mx-auto w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] text-[13px] leading-relaxed text-black">
      {/* 標題 */}
      <h1 className="text-center text-3xl font-bold tracking-[0.4em]">
        {quote.docType}
      </h1>

      <div className="mt-6 flex items-start justify-between gap-8">
        {/* 宛名 */}
        <div className="min-w-0 flex-1">
          {quote.customerPostalCode ? (
            <p className="text-xs">〒{quote.customerPostalCode}</p>
          ) : null}
          {customerAddress ? <p className="text-xs">{customerAddress}</p> : null}
          <p className="mt-1 border-b border-black pb-1 text-lg font-bold">
            {quote.customerName} 様
          </p>
        </div>

        {/* 発行元 */}
        <div className="w-[78mm] shrink-0 text-xs">
          <p className="text-right">No. {String(quote.docNumber).padStart(6, "0")}</p>
          <p className="text-right">発行日 {formatDate(quote.createdOn)}</p>
          {shop?.logoUrl ? (
            <img
              src={shop.logoUrl}
              alt=""
              className="mt-2 ml-auto h-12 w-auto object-contain"
            />
          ) : null}
          <p className="mt-2 text-base font-bold">
            {shop?.companyName || "（会社名未設定）"}
          </p>
          {shop?.postalCode ? <p>〒{shop.postalCode}</p> : null}
          {shopAddress ? <p>{shopAddress}</p> : null}
          {shop?.phone ? <p>TEL：{shop.phone}</p> : null}
          {shop?.fax ? <p>FAX：{shop.fax}</p> : null}
          {shop?.website ? <p>{shop.website}</p> : null}
          {shop?.invoiceNumber ? <p>登録番号：{shop.invoiceNumber}</p> : null}
        </div>
      </div>

      <p className="mt-6 text-sm">{leadText}</p>

      {/* 合計金額。ひと目で分かるよう枠で囲って大きく出す */}
      <div className="mt-3 flex items-center gap-6 border-2 border-black px-5 py-3">
        <span className="text-sm font-bold tracking-widest">{totalLabel}</span>
        <span className="flex-1 text-right text-2xl font-bold tabular-nums">
          ¥{summary.total.toLocaleString()}
        </span>
        <span className="text-xs">（税込）</span>
      </div>

      {/* 件名・対象車両 */}
      <table className="mt-5 w-full text-xs">
        <tbody>
          <tr>
            <th className="w-24 border border-black bg-neutral-100 px-2 py-1 text-left font-normal">
              件名
            </th>
            <td className="border border-black px-2 py-1">
              {quote.title || quote.caseTitle}
            </td>
          </tr>
          <tr>
            <th className="border border-black bg-neutral-100 px-2 py-1 text-left font-normal">
              対象車両
            </th>
            <td className="border border-black px-2 py-1">
              {quote.vehicleModelName}
              {quote.vehicleNumber ? `（${quote.vehicleNumber}）` : ""}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 明細 */}
      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-black px-2 py-1.5 text-left font-bold">
              項目
            </th>
            <th className="w-16 border border-black px-2 py-1.5 text-right font-bold">
              数量
            </th>
            <th className="w-28 border border-black px-2 py-1.5 text-right font-bold">
              単価
            </th>
            <th className="w-28 border border-black px-2 py-1.5 text-right font-bold">
              金額
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="border border-black px-2 py-1.5">{item.name}</td>
              <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                {item.quantity}
              </td>
              <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                {item.unitPrice.toLocaleString()}
              </td>
              <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                {(item.quantity * item.unitPrice).toLocaleString()}
              </td>
            </tr>
          ))}
          {/* 明細が少なくても表の高さが極端に変わらないよう、最低行数を空行で埋める */}
          {Array.from({ length: Math.max(0, 8 - items.length) }).map((_, i) => (
            <tr key={`blank-${i}`}>
              <td className="border border-black px-2 py-1.5">&nbsp;</td>
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
              <td className="border border-black px-2 py-1.5" />
            </tr>
          ))}
        </tbody>
      </table>

      {/* 合計欄 */}
      <div className="mt-4 flex justify-end">
        <table className="w-[80mm] border-collapse text-xs">
          <tbody>
            <tr>
              <th className="border border-black bg-neutral-100 px-2 py-1.5 text-left font-normal">
                数量合計
              </th>
              <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                {summary.quantity}
              </td>
            </tr>
            <tr>
              <th className="border border-black bg-neutral-100 px-2 py-1.5 text-left font-normal">
                小計（税抜）
              </th>
              <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                ¥{summary.subtotal.toLocaleString()}
              </td>
            </tr>
            <tr>
              <th className="border border-black bg-neutral-100 px-2 py-1.5 text-left font-normal">
                消費税（{quote.taxRate}%）
              </th>
              <td className="border border-black px-2 py-1.5 text-right tabular-nums">
                ¥{summary.tax.toLocaleString()}
              </td>
            </tr>
            <tr>
              <th className="border border-black bg-neutral-100 px-2 py-2 text-left font-bold">
                合計（税込）
              </th>
              <td className="border border-black px-2 py-2 text-right text-base font-bold tabular-nums">
                ¥{summary.total.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 振込先は請求書のときだけ。見積書では出さない（元レイアウトと同じ） */}
      {isInvoice && shop?.bankInfo ? (
        <div className="mt-5 border border-black px-3 py-2 text-xs">
          <p className="font-bold">振込の場合は下記銀行宛に振込願います。</p>
          <p className="mt-1 whitespace-pre-wrap">{shop.bankInfo}</p>
        </div>
      ) : null}

      {/* 通信欄 */}
      {quote.note ? (
        <div className="mt-5 text-xs">
          <p className="font-bold">通信欄</p>
          <p className="mt-1 min-h-[18mm] border border-black px-3 py-2 whitespace-pre-wrap">
            {quote.note}
          </p>
        </div>
      ) : null}
    </article>
  );
}

/** 「2026-09-14」を「2026年9月14日」にする（帳票の慣習に合わせる） */
function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${year}年${Number(month)}月${Number(day)}日`;
}
