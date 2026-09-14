import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";
import { caseInputSchema, caseStatusValues, caseUpdateInputSchema } from "~/lib/validation";
import { createCase, deleteCase, getCase, listCases, updateCase } from "~/server/cases";
import { listVehicleOptions } from "~/server/vehicles";

export const Route = createFileRoute("/cases")({
  loader: async () => ({
    cases: await listCases(),
    vehicleOptions: await listVehicleOptions(),
  }),
  component: CasesPage,
});

type CaseRow = Awaited<ReturnType<typeof listCases>>[number];
type CaseDetail = Awaited<ReturnType<typeof getCase>>;

const assigneeOptions = ["勝又", "佐藤", "鈴木", "その他"];

function CasesPage() {
  const { cases, vehicleOptions } = Route.useLoaderData();
  const router = useRouter();

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: CaseDetail } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function reload() {
    await router.invalidate();
  }

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/login" });
  }

  async function openEdit(row: CaseRow) {
    setFormError(null);
    try {
      const detail = await getCase({ data: { id: row.id } });
      setModal({ mode: "edit", item: detail });
    } catch {
      setListError("案件情報の取得に失敗しました。");
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
        const parsed = caseInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createCase({ data: parsed.data });
      } else {
        const parsed = caseUpdateInputSchema.safeParse({
          ...formData,
          id: modal.item.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateCase({ data: parsed.data });
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

  async function handleDelete(row: CaseRow) {
    if (!window.confirm(`「${row.title}」を削除しますか？（関連する見積・請求も削除されます）`)) {
      return;
    }
    setListError(null);
    try {
      await deleteCase({ data: { id: row.id } });
      await reload();
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  const vehicleSelectOptions = vehicleOptions.map((v) => ({
    value: v.id,
    label: `${v.modelName}（${v.customerName}）`,
  }));

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm">
            <Link to="/" className="text-slate-500 underline">
              ← ダッシュボードへ
            </Link>
          </p>
          <h1 className="text-xl font-bold">案件</h1>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={button({ variant: "outline", size: "sm" })}
        >
          ログアウト
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium">案件一覧（{cases.length} 件）</h2>
          <button
            type="button"
            className={button({ size: "sm" })}
            disabled={vehicleOptions.length === 0}
            onClick={() => {
              setFormError(null);
              setModal({ mode: "create" });
            }}
          >
            新規作成
          </button>
        </div>

        {vehicleOptions.length === 0 ? (
          <p className="mt-2 text-sm text-amber-600">
            先に「車両」を登録してください。
          </p>
        ) : null}

        {listError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {listError}
          </p>
        ) : null}

        {cases.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">案件が登録されていません。</p>
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
                    {c.customerName} ／ {c.vehicleName} ／ {c.status} ／ 担当:{" "}
                    {c.assignee || "-"}
                  </p>
                  <p className="text-sm text-slate-500">
                    {c.plannedStartOn || "-"} 〜 {c.plannedEndOn || "-"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/cases/$id"
                    params={{ id: c.id }}
                    className={button({ variant: "outline", size: "sm" })}
                  >
                    詳細
                  </Link>
                  <button
                    type="button"
                    className={button({ variant: "outline", size: "sm" })}
                    onClick={() => openEdit(c)}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className={button({ variant: "outline", size: "sm" })}
                    onClick={() => handleDelete(c)}
                  >
                    削除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "案件を編集" : "案件を新規作成"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <SelectField
            name="vehicleId"
            label="対象車両"
            options={vehicleSelectOptions}
            defaultValue={
              modal?.mode === "edit" ? modal.item.vehicleId : vehicleSelectOptions[0]?.value
            }
          />
          <TextField
            name="title"
            label="案件名"
            required
            defaultValue={modal?.mode === "edit" ? modal.item.title : ""}
          />
          <SelectField
            name="status"
            label="ステータス"
            options={caseStatusValues.map((v) => ({ value: v, label: v }))}
            defaultValue={modal?.mode === "edit" ? modal.item.status : "未作業"}
          />
          <SelectField
            name="assignee"
            label="担当者"
            options={assigneeOptions.map((v) => ({ value: v, label: v }))}
            defaultValue={modal?.mode === "edit" ? (modal.item.assignee ?? "") : ""}
          />
          <TextField
            name="plannedStartOn"
            label="作業：開始予定日"
            type="date"
            defaultValue={
              modal?.mode === "edit" ? (modal.item.plannedStartOn ?? "") : ""
            }
          />
          <TextField
            name="plannedEndOn"
            label="作業：終了予定日"
            type="date"
            defaultValue={
              modal?.mode === "edit" ? (modal.item.plannedEndOn ?? "") : ""
            }
          />
          <TextField
            name="content"
            label="案件：内容"
            multiline
            rows={3}
            defaultValue={modal?.mode === "edit" ? (modal.item.content ?? "") : ""}
          />
          <TextField
            name="workContent"
            label="作業：内容"
            multiline
            rows={3}
            defaultValue={
              modal?.mode === "edit" ? (modal.item.workContent ?? "") : ""
            }
          />
          <TextField
            name="note"
            label="備考"
            multiline
            rows={3}
            defaultValue={modal?.mode === "edit" ? (modal.item.note ?? "") : ""}
          />

          {formError ? (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "登録"}
          </button>
        </form>
      </Modal>
    </main>
  );
}
