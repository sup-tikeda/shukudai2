import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  DataTable,
  DetailItem,
  DetailList,
  PageHeader,
  RemainingDaysLabel,
  statusTone,
} from "~/components/ui/layout";
import { listCases } from "~/server/cases";
import { getVehicle } from "~/server/vehicles";

export const Route = createFileRoute("/vehicles_/$id")({
  loader: async ({ params }) => {
    const [vehicle, allCases] = await Promise.all([
      getVehicle({ data: { id: params.id } }),
      listCases(),
    ]);
    return {
      vehicle,
      cases: allCases.filter((c) => c.vehicleId === params.id),
    };
  },
  component: VehicleDetailPage,
});

type CaseRow = ReturnType<typeof Route.useLoaderData>["cases"][number];

function VehicleDetailPage() {
  const { vehicle, cases } = Route.useLoaderData();

  return (
    <AppShell>
      <PageHeader
        title={vehicle.modelName}
        backTo="/vehicles"
        backLabel="車両一覧"
        subtitle={
          <>
            No. {String(vehicle.manageNumber).padStart(6, "0")} ／ 所有者：
            <Link
              to="/customers/$id"
              params={{ id: vehicle.customerId }}
              className="text-accent underline underline-offset-4"
            >
              {vehicle.customerName}
            </Link>
          </>
        }
      />

      <Card title="車両情報">
        <DetailList>
          <DetailItem label="車両番号">{vehicle.vehicleNumber}</DetailItem>
          <DetailItem label="メーカー">{vehicle.maker}</DetailItem>
          <DetailItem label="排気量">
            {vehicle.displacement ? `${vehicle.displacement}cc` : ""}
          </DetailItem>
          <DetailItem label="年式">{vehicle.modelYear ?? ""}</DetailItem>
          <DetailItem label="色">{vehicle.color}</DetailItem>
          <DetailItem label="車検期限">
            {vehicle.inspectionExpiresOn}
          </DetailItem>
          <DetailItem label="登録日">{vehicle.registeredOn}</DetailItem>
          <DetailItem label="保険情報">{vehicle.insuranceInfo}</DetailItem>
          <DetailItem label="事故歴" wide>
            {vehicle.accidentHistory}
          </DetailItem>
          <DetailItem label="カスタマイズ情報" wide>
            {vehicle.customizationInfo}
          </DetailItem>
          <DetailItem label="備考" wide>
            {vehicle.note}
          </DetailItem>
        </DetailList>
      </Card>

      <div className="mt-6">
        <Card
          title="案件"
          count={`${cases.length} 件`}
          actions={
            <Link
              to="/cases"
              search={{ new: vehicle.id }}
              className={button({ variant: "outline", size: "sm" })}
            >
              ＋ 案件を登録
            </Link>
          }
        >
          <DataTable
            rows={cases}
            rowKey={(c) => c.id}
            emptyMessage="この車両の案件はまだありません。"
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
                key: "assignee",
                header: "担当者",
                render: (c: CaseRow) =>
                  c.assignee || <span className="text-ink-faint">未定</span>,
              },
              {
                key: "planned",
                header: "作業予定",
                render: (c: CaseRow) => (
                  <div className="whitespace-nowrap tabular-nums">
                    <p>{c.plannedStartOn || "-"} 〜</p>
                    <p className="mt-0.5">
                      {c.plannedEndOn || "-"}
                      {c.status !== "完了済み" && c.plannedEndOn ? (
                        <RemainingDaysLabel endOn={c.plannedEndOn} />
                      ) : null}
                    </p>
                  </div>
                ),
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
    </AppShell>
  );
}
