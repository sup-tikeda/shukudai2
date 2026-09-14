import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
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

function VehicleDetailPage() {
  const { vehicle, cases } = Route.useLoaderData();

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <p className="text-sm">
        <Link to="/vehicles" className="text-slate-500 underline">
          ← 車両一覧へ
        </Link>
      </p>
      <h1 className="mt-1 text-xl font-bold">{vehicle.modelName}</h1>
      <p className="text-sm text-slate-500">
        所有者：
        <Link
          to="/customers/$id"
          params={{ id: vehicle.customerId }}
          className="underline"
        >
          {vehicle.customerName}
        </Link>
      </p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">車両情報</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">車両番号</dt>
            <dd>{vehicle.vehicleNumber || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">メーカー</dt>
            <dd>{vehicle.maker || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">排気量</dt>
            <dd>{vehicle.displacement ? `${vehicle.displacement}cc` : "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">年式</dt>
            <dd>{vehicle.modelYear ?? "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">色</dt>
            <dd>{vehicle.color || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">車検期限</dt>
            <dd>{vehicle.inspectionExpiresOn || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">登録日</dt>
            <dd>{vehicle.registeredOn || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">保険情報</dt>
            <dd>{vehicle.insuranceInfo || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">事故歴</dt>
            <dd className="whitespace-pre-wrap">{vehicle.accidentHistory || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">カスタマイズ情報</dt>
            <dd className="whitespace-pre-wrap">
              {vehicle.customizationInfo || "-"}
            </dd>
          </div>
          {vehicle.note ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">備考</dt>
              <dd className="whitespace-pre-wrap">{vehicle.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-medium">案件（{cases.length} 件）</h2>
          <Link to="/cases" className={button({ variant: "outline", size: "sm" })}>
            案件を登録
          </Link>
        </div>

        {cases.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">案件はありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {cases.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{c.title}</p>
                  <p className="text-sm text-slate-500">
                    {c.status} ／ 担当: {c.assignee || "-"}
                  </p>
                </div>
                <Link
                  to="/cases/$id"
                  params={{ id: c.id }}
                  className={button({ variant: "outline", size: "sm" })}
                >
                  詳細
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
