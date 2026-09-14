import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable } from "~/components/ui/layout";

type Row = { id: string; name: string; count: number };

const columns = [
  { key: "name", header: "名前", width: "w-full", render: (r: Row) => r.name },
  {
    key: "count",
    header: "台数",
    align: "center" as const,
    render: (r: Row) => `${r.count} 台`,
  },
];

describe("DataTable", () => {
  it("列見出しと各行の値を、項目ごとの列に分けて描画する", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[
          { id: "1", name: "佐々木 花子", count: 1 },
          { id: "2", name: "有限会社サンプル商会", count: 2 },
        ]}
        rowKey={(r) => r.id}
        emptyMessage="ありません"
      />,
    );

    expect(html).toContain("<table");
    expect(html).toContain("名前");
    expect(html).toContain("台数");
    expect(html).toContain("佐々木 花子");
    // 行数ぶんの <tr> が出ていること（見出し行を含めて3つ）
    expect(html.match(/<tr/g)?.length).toBe(3);
  });

  it("見出し行はスクロールしても残るよう sticky にする", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[{ id: "1", name: "テスト", count: 0 }]}
        rowKey={(r) => r.id}
        emptyMessage="ありません"
      />,
    );

    expect(html).toContain("sticky");
  });

  it("0件のときは表ではなく案内文を出す", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={(r) => r.id}
        emptyMessage="顧客が登録されていません。"
      />,
    );

    expect(html).not.toContain("<table");
    expect(html).toContain("顧客が登録されていません。");
  });
});
