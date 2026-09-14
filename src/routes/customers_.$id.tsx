import { createFileRoute, Link } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
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

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <p className="text-sm">
        <Link to="/customers" className="text-slate-500 underline">
          ← 顧客一覧へ
        </Link>
      </p>
      <h1 className="mt-1 text-xl font-bold">{customer.name}</h1>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">基本情報</h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">電話番号</dt>
            <dd>{customer.phone || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">携帯電話</dt>
            <dd>{customer.mobilePhone || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">メールアドレス</dt>
            <dd>{customer.email || "-"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">免許証番号</dt>
            <dd>{customer.licenseNumber || "-"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">住所</dt>
            <dd>
              {[customer.postalCode, customer.address, customer.addressLine2, customer.building]
                .filter(Boolean)
                .join(" ") || "-"}
            </dd>
          </div>
          {customer.note ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">備考</dt>
              <dd className="whitespace-pre-wrap">{customer.note}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-medium">保有車両（{vehicles.length} 台）</h2>
          <Link to="/vehicles" className={button({ variant: "outline", size: "sm" })}>
            車両を登録
          </Link>
        </div>

        {vehicles.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">保有車両はありません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {vehicles.map((vehicle) => (
              <li
                key={vehicle.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{vehicle.modelName}</p>
                  <p className="text-sm text-slate-500">
                    {vehicle.maker || "-"} ／ 案件 {vehicle.caseCount} 件
                  </p>
                </div>
                <Link
                  to="/vehicles/$id"
                  params={{ id: vehicle.id }}
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
