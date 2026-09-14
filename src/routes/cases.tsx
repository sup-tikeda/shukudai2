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
  remainingDays,
  Row,
  RowList,
  statusTone,
} from "~/components/ui/layout";
import {
  caseInputSchema,
  caseStatusValues,
  caseUpdateInputSchema,
} from "~/lib/validation";
import {
  createCase,
  deleteCase,
  getCase,
  listCases,
  updateCase,
} from "~/server/cases";
import { listStaffOptions } from "~/server/accounts";
import { listVehicleOptions } from "~/server/vehicles";

export const Route = createFileRoute("/cases")({
  // 車両詳細から «＋ 案件を登録» で来た時、その車両を選んだ状態でフォームを開くため
  // 戻り値を任意項目にしておく（付けずにこの画面へ来るリンクも成り立たせるため）
  validateSearch: (search: Record<string, unknown>): { new?: string } =>
    typeof search.new === "string" ? { new: search.new } : {},
  loader: async () => ({
    cases: await listCases(),
    vehicleOptions: await listVehicleOptions(),
    staff: await listStaffOptions(),
  }),
  component: CasesPage,
});

type CaseRow = Awaited<ReturnType<typeof listCases>>[number];
type CaseDetail = Awaited<ReturnType<typeof getCase>>;

/**
 * 担当者の選択肢を組み立てる。
 *
 * 案件には担当者の「名前」を保存しており、社員マスタとは外部キーで結んでいない。
 * 退職などで社員マスタから消えても過去の案件の記録を変えないためだが、
 * その案件を編集したときに担当者が黙って空になっては困るので、
 * いま設定されている名前が一覧に無ければ選択肢に足しておく。
 */
function assigneeOptions(
  staff: { name: string }[],
  current: string | null | undefined,
) {
  const options = [
    { value: "", label: "未定" },
    ...staff.map((member) => ({ value: member.name, label: member.name })),
  ];

  if (current && !staff.some((member) => member.name === current)) {
    options.push({ value: current, label: `${current}（社員マスタにありません）` });
  }
  return options;
}

function CasesPage() {
  const { cases, vehicleOptions, staff } = Route.useLoaderData();
  const { new: presetVehicleId } = Route.useSearch();
  const router = useRouter();

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: CaseDetail } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("start");

  // 車両詳細から遷移してきた場合は、その車両を選んだ状態で作成フォームを開く
  useEffect(() => {
    if (presetVehicleId) {
      setModal({ mode: "create" });
    }
  }, [presetVehicleId]);

  const statusOrder: Record<string, number> = {
    作業中: 0,
    未作業: 1,
    完了済み: 2,
  };

  const visibleCases = cases
    .filter((c) =>
      matchesQuery(query, [
        c.title,
        c.status,
        c.assignee,
        c.vehicleName,
        c.customerName,
      ]),
    )
    .sort((a, b) => {
      if (sortKey === "status") {
        return (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      }
      if (sortKey === "end") {
        return (a.plannedEndOn ?? "9999-12-31").localeCompare(
          b.plannedEndOn ?? "9999-12-31",
        );
      }
      return (a.plannedStartOn ?? "9999-12-31").localeCompare(
        b.plannedStartOn ?? "9999-12-31",
      );
    });

  async function reload() {
    await router.invalidate();
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
    if (
      !window.confirm(
        `「${row.title}」を削除しますか？\n関連する見積・請求とその明細もすべて削除されます。`,
      )
    ) {
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
    // 見出しと絞り込みは固定し、一覧の中だけをスクロールさせる
    <AppShell fill>
      <PageHeader
        eyebrow="Cases"
        title="案件"
        subtitle="整備・修理などの作業案件と進行状況を管理します。"
        actions={
          <button
            type="button"
            className={button({ size: "sm" })}
            disabled={vehicleOptions.length === 0}
            onClick={() => {
              setFormError(null);
              setModal({ mode: "create" });
            }}
          >
            ＋ 新規作成
          </button>
        }
      />

      {vehicleOptions.length === 0 ? (
        <p className="mb-4 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          先に「車両」を登録してください。案件は車両に紐づけて管理します。
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
        placeholder="案件名・担当者・車両・顧客で絞り込み"
        sortKey={sortKey}
        onSortChange={setSortKey}
        sortOptions={[
          { value: "start", label: "開始予定日順" },
          { value: "end", label: "終了予定日が近い順" },
          { value: "status", label: "ステータス順" },
        ]}
      />

      {/* 一覧は残りの高さいっぱいに広げ、中身だけをスクロールさせる */}
      <Card
        fill
        title="案件一覧"
        count={
          query
            ? `${visibleCases.length} / ${cases.length} 件`
            : `${cases.length} 件`
        }
      >
        {visibleCases.length === 0 ? (
          <EmptyState
            message={
              cases.length === 0
                ? "案件が登録されていません。"
                : "条件に合う案件が見つかりませんでした。"
            }
          />
        ) : (
          <RowList>
            {visibleCases.map((c) => (
              <Row
                key={c.id}
                actions={
                  <>
                    <Link
                      to="/cases/$id"
                      params={{ id: c.id }}
                      className={button({ variant: "outline", size: "sm" })}
                    >
                      詳細
                    </Link>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => openEdit(c)}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => handleDelete(c)}
                    >
                      削除
                    </button>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium break-words">{c.title}</p>
                  <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  {c.invoiced ? <Badge tone="done">請求済み</Badge> : null}
                </div>
                <p className="mt-0.5 text-sm text-ink-muted break-words">
                  {c.customerName} ／ {c.vehicleName} ／ 担当:{" "}
                  {c.assignee || "未定"}
                </p>
                <p className="mt-0.5 text-sm text-ink-faint tabular-nums">
                  {c.plannedStartOn || "-"} 〜 {c.plannedEndOn || "-"}
                  {c.status !== "完了済み" && c.plannedEndOn ? (
                    <RemainingDays endOn={c.plannedEndOn} />
                  ) : null}
                </p>
              </Row>
            ))}
          </RowList>
        )}
      </Card>

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
              modal?.mode === "edit"
                ? modal.item.vehicleId
                : (presetVehicleId ?? vehicleSelectOptions[0]?.value)
            }
          />
          <TextField
            name="title"
            label="案件名"
            required
            defaultValue={modal?.mode === "edit" ? modal.item.title : ""}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              name="status"
              label="ステータス"
              options={caseStatusValues.map((v) => ({ value: v, label: v }))}
              defaultValue={modal?.mode === "edit" ? modal.item.status : "未作業"}
            />
            <SelectField
              name="assignee"
              label="担当者"
              // 選択肢は社員マスタ（設定画面）の名前
              options={assigneeOptions(
                staff,
                modal?.mode === "edit" ? modal.item.assignee : null,
              )}
              defaultValue={
                modal?.mode === "edit" ? (modal.item.assignee ?? "") : ""
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="plannedStartOn"
              label="開始予定日"
              type="date"
              defaultValue={
                modal?.mode === "edit" ? (modal.item.plannedStartOn ?? "") : ""
              }
            />
            <TextField
              name="plannedEndOn"
              label="終了予定日"
              type="date"
              defaultValue={
                modal?.mode === "edit" ? (modal.item.plannedEndOn ?? "") : ""
              }
            />
          </div>
          <TextField
            name="content"
            label="案件内容"
            multiline
            rows={3}
            defaultValue={modal?.mode === "edit" ? (modal.item.content ?? "") : ""}
          />
          <TextField
            name="workContent"
            label="作業内容"
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
            rows={2}
            defaultValue={modal?.mode === "edit" ? (modal.item.note ?? "") : ""}
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

/** 終了予定日までの残り日数。期限切れは赤、3日以内はオレンジで注意を促す。 */
function RemainingDays({ endOn }: { endOn: string }) {
  const days = remainingDays(endOn);
  if (days === null) return null;
  const tone =
    days === 0 ? "text-danger" : days <= 3 ? "text-accent" : "text-ink-faint";
  return (
    <span className={`ml-2 ${tone}`}>
      {days === 0 ? "（期限超過）" : `（残り${days}日）`}
    </span>
  );
}
