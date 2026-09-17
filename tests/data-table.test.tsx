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

  it("スマホ用に、1件を1枚のカードにした縦積みも同時に描画する", () => {
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

    // 表はmd以上でだけ出し、カードはmd未満でだけ出す
    expect(html).toContain('<table class="hidden w-full min-w-[44rem]');
    expect(html).toContain('<ul class="md:hidden">');
    // カードは行数ぶん出る
    expect(html.match(/<li /g)?.length).toBe(2);
    // ラベルと値の組がカード側にも出ている
    expect(html).toContain("<dt");
    expect(html).toContain("<dd");
  });

  it("操作ボタンの列は、カードでは下部にまとめる", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={[
          ...columns,
          {
            key: "actions",
            header: "",
            render: () => <button type="button">削除</button>,
          },
        ]}
        rows={[{ id: "1", name: "テスト", count: 0 }]}
        rowKey={(r) => r.id}
        emptyMessage="ありません"
      />,
    );

    // 表とカードで1回ずつ、合わせて2回出る
    expect(html.match(/削除/g)?.length).toBe(2);
    expect(html).toContain("mt-3 flex flex-wrap justify-end gap-2");
  });
});
