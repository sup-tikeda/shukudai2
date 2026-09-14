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
  statusTone,
} from "~/components/ui/layout";
import { listCases } from "~/server/cases";
import { getCustomer } from "~/server/customers";
import { listQuotes } from "~/server/quotes";
import { listVehicles } from "~/server/vehicles";

export const Route = createFileRoute("/customers_/$id")({
  loader: async ({ params }) => {
    const [customer, allVehicles, allCases, allQuotes] = await Promise.all([
      getCustomer({ data: { id: params.id } }),
      listVehicles(),
      listCases(),
      listQuotes(),
    ]);

    const vehicles = allVehicles.filter((v) => v.customerId === params.id);
    const cases = allCases.filter((c) => c.customerId === params.id);
    const caseIds = new Set(cases.map((c) => c.id));

    return {
      customer,
      vehicles,
      cases,
      // 元FileMakerの顧客詳細と同じく、この顧客に紐づく見積・請求もまとめて出す
      quotes: allQuotes.filter((q) => caseIds.has(q.caseId)),
    };
  },
  component: CustomerDetailPage,
});

type VehicleRow = ReturnType<typeof Route.useLoaderData>["vehicles"][number];
type CaseRow = ReturnType<typeof Route.useLoaderData>["cases"][number];
type QuoteRow = ReturnType<typeof Route.useLoaderData>["quotes"][number];

function CustomerDetailPage() {
  const { customer, vehicles, cases, quotes } = Route.useLoaderData();

  const address =
    [
      customer.postalCode ? `〒${customer.postalCode}` : "",
      customer.address,
      customer.addressLine2,
      customer.building,
    ]
      .filter(Boolean)
      .join(" ") || "";

  return (
    <AppShell>
      <PageHeader
        title={customer.name}
        subtitle={`No. ${String(customer.customerNumber).padStart(6, "0")} ／ 車両 ${vehicles.length} 台 ／ 案件 ${cases.length} 件 ／ 見積・請求 ${quotes.length} 件`}
        backTo="/customers"
        backLabel="顧客一覧"
      />

      <Card title="基本情報">
        <DetailList>
          <DetailItem label="電話番号">{customer.phone}</DetailItem>
          <DetailItem label="携帯電話">{customer.mobilePhone}</DetailItem>
          <DetailItem label="メールアドレス">{customer.email}</DetailItem>
          <DetailItem label="免許証番号">{customer.licenseNumber}</DetailItem>
          <DetailItem label="住所" wide>
            {address}
          </DetailItem>
          <DetailItem label="備考" wide>
            {customer.note}
          </DetailItem>
        </DetailList>
      </Card>

      <div className="mt-6">
        <Card
          title="保有車両"
          count={`${vehicles.length} 台`}
          actions={
            // この顧客を選んだ状態で車両登録を開く（選び直す手間をなくす）
            <Link
              to="/vehicles"
              search={{ new: customer.id }}
              className={button({ variant: "outline", size: "sm" })}
            >
              ＋ 車両を登録
            </Link>
          }
        >
          <DataTable
            rows={vehicles}
            rowKey={(vehicle) => vehicle.id}
            emptyMessage="保有車両はありません。"
            columns={[
              {
                key: "model",
                header: "モデル名",
                width: "min-w-[9rem]",
                render: (vehicle: VehicleRow) => (
                  <p className="font-medium break-words">
                    {vehicle.modelName}
                  </p>
                ),
              },
              {
                key: "maker",
                header: "メーカー",
                render: (vehicle: VehicleRow) =>
                  vehicle.maker || <span className="text-ink-faint">-</span>,
              },
              {
                key: "cases",
                header: "案件",
                align: "center",
                render: (vehicle: VehicleRow) => (
                  <span className="whitespace-nowrap tabular-nums">
                    {vehicle.caseCount} 件
                  </span>
                ),
              },
              {
                key: "inspection",
                header: "車検期限",
                render: (vehicle: VehicleRow) =>
                  vehicle.inspectionExpiresOn || (
                    <span className="text-ink-faint">-</span>
                  ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (vehicle: VehicleRow) => (
                  <Link
                    to="/vehicles/$id"
                    params={{ id: vehicle.id }}
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

      <div className="mt-6">
        <Card title="案件" count={`${cases.length} 件`}>
          <DataTable
            rows={cases}
            rowKey={(c) => c.id}
            emptyMessage="案件はありません。"
            columns={[
              {
                key: "title",
                header: "案件名",
                width: "min-w-[10rem]",
                render: (c: CaseRow) => (
                  <p className="font-medium break-words">{c.title}</p>
                ),
              },
              {
                key: "status",
                header: "ステータス",
                render: (c: CaseRow) => (
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                ),
              },
              {
                key: "vehicle",
                header: "車両",
                render: (c: CaseRow) => (
                  <span className="break-words">{c.vehicleName}</span>
                ),
              },
              {
                key: "assignee",
                header: "担当者",
                render: (c: CaseRow) =>
                  c.assignee || <span className="text-ink-faint">未定</span>,
              },
              {
                key: "invoiced",
                header: "請求",
                align: "center",
                render: (c: CaseRow) =>
                  c.invoiced ? (
                    <Badge tone="done">済み</Badge>
                  ) : (
                    <span className="text-ink-faint">-</span>
                  ),
              },
              {
                key: "actions",
                header: "",
                align: "right",
                render: (c: CaseRow) => (
                  <Link
                    to="/cases/$id"
                    params={{ id: c.id }}
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

      <div className="mt-6">
        <Card title="見積・請求" count={`${quotes.length} 件`}>
          <DataTable
            rows={quotes}
            rowKey={(q) => q.id}
            emptyMessage="見積・請求はありません。"
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
