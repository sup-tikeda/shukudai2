import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import {
  AppShell,
  Card,
  DetailItem,
  DetailList,
  EmptyState,
  PageHeader,
  Row,
  RowList,
} from "~/components/ui/layout";
import { getCustomer } from "~/server/customers";
import { listVehicles } from "~/server/vehicles";

export const Route = createFileRoute("/customers_/$id")({
  loader: async ({ params }) => {
    const [customer, allVehicles] = await Promise.all([
      getCustomer({ data: { id: params.id } }),
      listVehicles(),
    ]);
    return {
      customer,
      vehicles: allVehicles.filter((v) => v.customerId === params.id),
    };
  },
  component: CustomerDetailPage,
});

function CustomerDetailPage() {
  const { customer, vehicles } = Route.useLoaderData();

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
        subtitle={`保有車両 ${vehicles.length} 台`}
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
            <Link
              to="/vehicles"
              className={button({ variant: "outline", size: "sm" })}
            >
              車両を登録
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
    </AppShell>
  );
}
