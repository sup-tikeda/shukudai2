import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailItem, DetailList } from "~/components/ui/layout";

describe("DetailList / DetailItem", () => {
  it("項目が少ないときは、2つずつ横に並べて2段にする", () => {
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
    // 4項目 → 2つずつの組で2段（2行）になること
    expect(html.match(/<tr/g)?.length).toBe(2);
  });

  it("項目が多いときは、1行に並べる組数を増やして2段に収める", () => {
    // 車両情報を想定した8項目（すべて通常項目）
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="車両番号">新宿 な 33-44</DetailItem>
        <DetailItem label="メーカー">スズキ</DetailItem>
        <DetailItem label="排気量">999cc</DetailItem>
        <DetailItem label="年式">2019</DetailItem>
        <DetailItem label="色">ホワイト</DetailItem>
        <DetailItem label="車検期限">2025-09-01</DetailItem>
        <DetailItem label="登録日">2019-09-01</DetailItem>
        <DetailItem label="保険情報">-</DetailItem>
      </DetailList>,
    );

    // 8項目 → 4つずつの組で2段（2行）に収まること
    expect(html.match(/<tr/g)?.length).toBe(2);
  });

  it("1行に並べる組数には上限がある（項目がどれだけ多くても際限なく横に伸ばさない）", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        {Array.from({ length: 20 }).map((_, i) => (
          <DetailItem key={i} label={`項目${i}`}>
            値{i}
          </DetailItem>
        ))}
      </DetailList>,
    );

    // 上限（4つ組）で頭打ちになり、2段には収まらず複数行になること
    const rowCount = html.match(/<tr/g)?.length ?? 0;
    expect(rowCount).toBeGreaterThan(2);
  });

  it("wideの項目は単独で1行にし、値の列いっぱいに広げる", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="電話番号">03-3333-4444</DetailItem>
        <DetailItem label="携帯電話">090-3333-4444</DetailItem>
        <DetailItem label="メールアドレス">tanaka@example.com</DetailItem>
        <DetailItem label="備考" wide>
          特になし
        </DetailItem>
      </DetailList>,
    );

    // (電話番号, 携帯電話) で1行、(メールアドレス) 単独で1行、(備考) 単独で1行の計3行
    expect(html.match(/<tr/g)?.length).toBe(3);
    expect(html).toContain("colSpan");
    expect(html).toContain("特になし");
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
