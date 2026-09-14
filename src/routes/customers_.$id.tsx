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
        subtitle={`車両 ${vehicles.length} 台 ／ 案件 ${cases.length} 件 ／ 見積・請求 ${quotes.length} 件`}
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
          {vehicles.length === 0 ? (
            <EmptyState message="保有車両はありません。" />
          ) : (
            <RowList>
              {vehicles.map((vehicle) => (
                <Row
                  key={vehicle.id}
                  actions={
                    <Link
                      to="/vehicles/$id"
                      params={{ id: vehicle.id }}
                      className={button({ variant: "outline", size: "sm" })}
                    >
                      詳細
                    </Link>
                  }
                >
                  <p className="font-medium break-words">{vehicle.modelName}</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {vehicle.maker || "メーカー未登録"} ／ 案件{" "}
                    {vehicle.caseCount} 件
                    {vehicle.inspectionExpiresOn
                      ? ` ／ 車検期限 ${vehicle.inspectionExpiresOn}`
                      : ""}
                  </p>
                </Row>
              ))}
            </RowList>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="案件" count={`${cases.length} 件`}>
          {cases.length === 0 ? (
            <EmptyState message="案件はありません。" />
          ) : (
            <RowList>
              {cases.map((c) => (
                <Row
                  key={c.id}
                  actions={
                    <Link
                      to="/cases/$id"
                      params={{ id: c.id }}
                      className={button({ variant: "outline", size: "sm" })}
                    >
                      詳細
                    </Link>
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium break-words">{c.title}</p>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    {c.invoiced ? <Badge tone="done">請求済み</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {c.vehicleName} ／ 担当: {c.assignee || "未定"}
                  </p>
                </Row>
              ))}
            </RowList>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="見積・請求" count={`${quotes.length} 件`}>
          {quotes.length === 0 ? (
            <EmptyState message="見積・請求はありません。" />
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
