import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DetailItem, DetailList } from "~/components/ui/layout";

describe("DetailList / DetailItem", () => {
  it("ラベル・値の1行の表として描画する（DataTableと体裁を揃える）", () => {
    const html = renderToStaticMarkup(
      <DetailList>
        <DetailItem label="電話番号">03-3333-4444</DetailItem>
        <DetailItem label="備考" wide>
          特になし
        </DetailItem>
      </DetailList>,
    );

    expect(html).toContain("<table");
    expect(html).toContain("電話番号");
    expect(html).toContain("03-3333-4444");
    // ラベル1つにつき1行（<tr>）になっていること
    expect(html.match(/<tr/g)?.length).toBe(2);
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
