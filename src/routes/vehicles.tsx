import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  EmptyState,
  ListToolbar,
  matchesQuery,
  PageHeader,
  Row,
  RowList,
  StickyBar,
} from "~/components/ui/layout";
import { vehicleInputSchema, vehicleUpdateInputSchema } from "~/lib/validation";
import { listCustomerOptions } from "~/server/customers";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  updateVehicle,
} from "~/server/vehicles";

export const Route = createFileRoute("/vehicles")({
  // 顧客詳細から «＋ 車両を登録» で来た時、その顧客を選んだ状態でフォームを開くため
  // 戻り値を任意項目にしておく（付けずにこの画面へ来るリンクも成り立たせるため）
  validateSearch: (search: Record<string, unknown>): { new?: string } =>
    typeof search.new === "string" ? { new: search.new } : {},
  loader: async () => ({
    vehicles: await listVehicles(),
    customerOptions: await listCustomerOptions(),
  }),
  component: VehiclesPage,
});

type VehicleRow = Awaited<ReturnType<typeof listVehicles>>[number];
type VehicleDetail = Awaited<ReturnType<typeof getVehicle>>;

const makerOptions = ["ホンダ", "ヤマハ", "スズキ", "カワサキ", "その他"];
const colorOptions = [
  "ブラック",
  "ホワイト",
  "レッド",
  "ブルー",
  "グリーン",
  "イエロー",
  "オレンジ",
  "グレー",
  "シルバー",
  "ゴールド",
  "マットブラック",
  "パープル",
  "ピンク",
  "その他",
];

function VehiclesPage() {
  const { vehicles, customerOptions } = Route.useLoaderData();
  const { new: presetCustomerId } = Route.useSearch();
  const router = useRouter();

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; vehicle: VehicleDetail } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("model");

  // 顧客詳細から遷移してきた場合は、その顧客を選んだ状態で登録フォームを開く
  useEffect(() => {
    if (presetCustomerId) {
      setModal({ mode: "create" });
    }
  }, [presetCustomerId]);

  const visibleVehicles = vehicles
    .filter((v) =>
      matchesQuery(query, [
        v.modelName,
        v.maker,
        v.vehicleNumber,
        v.customerName,
      ]),
    )
    .sort((a, b) => {
      if (sortKey === "inspection") {
        // 車検期限が近い順。未設定は最後に回す
        return (a.inspectionExpiresOn ?? "9999-12-31").localeCompare(
          b.inspectionExpiresOn ?? "9999-12-31",
        );
      }
      if (sortKey === "customer") {
        return a.customerName.localeCompare(b.customerName, "ja");
      }
      return a.modelName.localeCompare(b.modelName, "ja");
    });

  async function reload() {
    await router.invalidate();
  }

  async function openEdit(row: VehicleRow) {
    setFormError(null);
    try {
      const detail = await getVehicle({ data: { id: row.id } });
      setModal({ mode: "edit", vehicle: detail });
    } catch {
      setListError("車両情報の取得に失敗しました。");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      if (modal.mode === "create") {
        const parsed = vehicleInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createVehicle({ data: parsed.data });
      } else {
        const parsed = vehicleUpdateInputSchema.safeParse({
          ...formData,
          id: modal.vehicle.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateVehicle({ data: parsed.data });
      }

      setModal(null);
      await reload();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "保存に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(row: VehicleRow) {
    if (
      !window.confirm(
        `「${row.modelName}」を削除しますか？\n関連する案件・見積・請求もすべて削除されます。`,
      )
    ) {
      return;
    }
    setListError(null);
    try {
      await deleteVehicle({ data: { id: row.id } });
      await reload();
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  const customerSelectOptions = customerOptions.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <AppShell>
      {/* 一覧を下へスクロールしても、見出しと絞り込みが隠れないようにする */}
      <StickyBar>
        <PageHeader
          title="車両"
          subtitle="お預かりしている車両（バイク）の情報を管理します。"
          actions={
            <button
              type="button"
              className={button({ size: "sm" })}
              disabled={customerOptions.length === 0}
              onClick={() => {
                setFormError(null);
                setModal({ mode: "create" });
              }}
            >
              ＋ 新規登録
            </button>
          }
        />

        {customerOptions.length === 0 ? (
          <p className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
            先に「顧客」を登録してください。車両は顧客に紐づけて管理します。
          </p>
        ) : null}

        {listError ? (
          <p className="mb-4 text-sm text-danger" role="alert">
            {listError}
          </p>
        ) : null}

        <ListToolbar
          query={query}
          onQueryChange={setQuery}
          placeholder="モデル名・車両番号・メーカー・所有者で絞り込み"
          sortKey={sortKey}
          onSortChange={setSortKey}
          sortOptions={[
            { value: "model", label: "モデル名順" },
            { value: "inspection", label: "車検期限が近い順" },
            { value: "customer", label: "所有者順" },
          ]}
        />
      </StickyBar>

      <Card
        title="車両一覧"
        count={
          query
            ? `${visibleVehicles.length} / ${vehicles.length} 台`
            : `${vehicles.length} 台`
        }
      >
        {visibleVehicles.length === 0 ? (
          <EmptyState
            message={
              vehicles.length === 0
                ? "車両が登録されていません。"
                : "条件に合う車両が見つかりませんでした。"
            }
          />
        ) : (
          <RowList>
            {visibleVehicles.map((vehicle) => (
              <Row
                key={vehicle.id}
                actions={
                  <>
                    <Link
                      to="/vehicles/$id"
                      params={{ id: vehicle.id }}
                      className={button({ variant: "outline", size: "sm" })}
                    >
                      詳細
                    </Link>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => openEdit(vehicle)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => handleDelete(vehicle)}
                    >
                      削除
                    </button>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium break-words">{vehicle.modelName}</p>
                  {vehicle.maker ? (
                    <Badge>{vehicle.maker}</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted break-words">
                  {vehicle.customerName} ／ 案件 {vehicle.caseCount} 件
                  {vehicle.inspectionExpiresOn
                    ? ` ／ 車検期限 ${vehicle.inspectionExpiresOn}`
                    : ""}
                </p>
              </Row>
            ))}
          </RowList>
        )}
      </Card>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "車両を編集" : "車両を新規登録"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            name="customerId"
            label="所有者"
            options={customerSelectOptions}
            defaultValue={
              modal?.mode === "edit"
                ? modal.vehicle.customerId
                : (presetCustomerId ?? customerSelectOptions[0]?.value)
            }
          />
          <TextField
            name="modelName"
            label="モデル名"
            required
            defaultValue={modal?.mode === "edit" ? modal.vehicle.modelName : ""}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="vehicleNumber"
              label="車両番号"
              defaultValue={
                modal?.mode === "edit"
                  ? (modal.vehicle.vehicleNumber ?? "")
                  : ""
              }
            />
            <SelectField
              name="maker"
              label="メーカー"
              // 未選択を選べるようにする。空の選択肢が無いと、未指定でも先頭が保存されてしまう
              options={[
                { value: "", label: "未選択" },
                ...makerOptions.map((v) => ({ value: v, label: v })),
              ]}
              defaultValue={
                modal?.mode === "edit" ? (modal.vehicle.maker ?? "") : ""
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField
              name="displacement"
              label="排気量(cc)"
              defaultValue={
                modal?.mode === "edit" && modal.vehicle.displacement != null
                  ? String(modal.vehicle.displacement)
                  : ""
              }
            />
            <TextField
              name="modelYear"
              label="年式"
              defaultValue={
                modal?.mode === "edit" && modal.vehicle.modelYear != null
                  ? String(modal.vehicle.modelYear)
                  : ""
              }
            />
            <SelectField
              name="color"
              label="色"
              options={[
                { value: "", label: "未選択" },
                ...colorOptions.map((v) => ({ value: v, label: v })),
              ]}
              defaultValue={
                modal?.mode === "edit" ? (modal.vehicle.color ?? "") : ""
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="registeredOn"
              label="登録日"
              type="date"
              defaultValue={
                modal?.mode === "edit" ? (modal.vehicle.registeredOn ?? "") : ""
              }
            />
            <TextField
              name="inspectionExpiresOn"
              label="車検期限"
              type="date"
              defaultValue={
                modal?.mode === "edit"
                  ? (modal.vehicle.inspectionExpiresOn ?? "")
                  : ""
              }
            />
          </div>
          <TextField
            name="insuranceInfo"
            label="保険情報"
            defaultValue={
              modal?.mode === "edit" ? (modal.vehicle.insuranceInfo ?? "") : ""
            }
          />
          <TextField
            name="accidentHistory"
            label="事故歴"
            defaultValue={
              modal?.mode === "edit" ? (modal.vehicle.accidentHistory ?? "") : ""
            }
          />
          <TextField
            name="customizationInfo"
            label="カスタマイズ情報"
            defaultValue={
              modal?.mode === "edit"
                ? (modal.vehicle.customizationInfo ?? "")
                : ""
            }
          />
          <TextField
            name="note"
            label="備考"
            multiline
            rows={3}
            defaultValue={
              modal?.mode === "edit" ? (modal.vehicle.note ?? "") : ""
            }
          />

          {formError ? (
            <p className="text-sm text-danger" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "保存"}
          </button>
        </form>
      </Modal>
    </AppShell>
  );
}
