import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailItem, DetailList } from "~/components/ui/layout";

describe("DetailList / DetailItem", () => {
  it("通常の項目は2つずつ横に並べて1行にする", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="車両番号">新宿 な 33-44</DetailItem>
        <DetailItem label="メーカー">スズキ</DetailItem>
        <DetailItem label="排気量">999cc</DetailItem>
        <DetailItem label="年式">2019</DetailItem>
      </DetailList>,
    );

    expect(html).toContain("<table");
    expect(html).toContain("車両番号");
    expect(html).toContain("スズキ");
    // 4項目 → 2つずつの組で2行になること
    expect(html.match(/<tr/g)?.length).toBe(2);
  });

  it("wideの項目は単独で1行にし、値の列いっぱいに広げる", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="電話番号">03-3333-4444</DetailItem>
        <DetailItem label="備考" wide>
          特になし
        </DetailItem>
      </DetailList>,
    );

    // 電話番号（相方なし）で1行、備考（wide）で1行の計2行
    expect(html.match(/<tr/g)?.length).toBe(2);
    expect(html).toContain("colSpan");
    expect(html).toContain("特になし");
  });

  it("項目数が奇数のときは、最後の1件が値の列いっぱいに広がる", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="担当者">山田 太郎</DetailItem>
        <DetailItem label="ステータス">未作業</DetailItem>
        <DetailItem label="開始予定日">2026-06-01</DetailItem>
      </DetailList>,
    );

    // (担当者, ステータス) で1行、(開始予定日) 単独で1行の計2行
    expect(html.match(/<tr/g)?.length).toBe(2);
    expect(html).toContain("colSpan");
  });

  it("値が無いときは「-」を出す", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="携帯電話">{null}</DetailItem>
      </DetailList>,
    );

    expect(html).toContain("-");
  });
});
