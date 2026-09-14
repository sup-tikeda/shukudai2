import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Row,
  RowList,
} from "~/components/ui/layout";
import {
  accountCreateInputSchema,
  accountPasswordInputSchema,
  accountUpdateInputSchema,
  assigneeInputSchema,
  assigneeUpdateInputSchema,
  shopSettingsInputSchema,
} from "~/lib/validation";
import {
  createAssignee,
  deleteAssignee,
  listAssignees,
  updateAssignee,
} from "~/server/assignees";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  updateAccountPassword,
} from "~/server/accounts";
import { getShopSettings, updateShopSettings } from "~/server/shopSettings";

export const Route = createFileRoute("/master")({
  // 未ログイン、もしくはadmin以外はサーバー側でリダイレクトされる
  loader: async () => ({
    accounts: await listAccounts(),
    assignees: await listAssignees(),
    shopSettings: await getShopSettings(),
  }),
  component: MasterPage,
});

type Account = Awaited<ReturnType<typeof listAccounts>>[number];
type AssigneeRow = Awaited<ReturnType<typeof listAssignees>>[number];

const roleOptions = [
  { value: "admin", label: "管理者" },
  { value: "user", label: "一般" },
];

type Tab = "employees" | "assignees" | "shopSettings";

const tabs: { value: Tab; label: string }[] = [
  { value: "employees", label: "社員マスタ" },
  { value: "assignees", label: "担当者マスタ" },
  { value: "shopSettings", label: "会社設定" },
];

function MasterPage() {
  const { accounts, assignees, shopSettings } = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("employees");

  async function reload() {
    await router.invalidate();
  }

  return (
    <AppShell>
      <PageHeader
        title="設定"
        subtitle="ログインアカウント・案件の担当者・見積請求書に印字する自社情報を管理します。"
      />

      <div className="flex flex-col gap-5 sm:flex-row">
        <nav className="flex shrink-0 gap-2 sm:w-44 sm:flex-col">
          {tabs.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={button({
                variant: tab === item.value ? "primary" : "outline",
                className: "w-full justify-start",
              })}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1">
          {tab === "employees" ? (
            <EmployeeSection accounts={accounts} onChanged={reload} />
          ) : tab === "assignees" ? (
            <AssigneeSection assignees={assignees} onChanged={reload} />
          ) : (
            <ShopSettingsSection settings={shopSettings} onChanged={reload} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

/**
 * 担当者マスタ。案件の「担当者」欄の選択肢になる。
 * ログインアカウント（社員マスタ）とは別管理にしている。
 * ログインしない人でも作業の担当にはなるため、両者は必ずしも一致しない。
 */
function AssigneeSection({
  assignees,
  onChanged,
}: {
  assignees: AssigneeRow[];
  onChanged: () => Promise<void>;
}) {
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; assignee: AssigneeRow } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      if (modal.mode === "create") {
        const parsed = assigneeInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createAssignee({ data: parsed.data });
      } else {
        const parsed = assigneeUpdateInputSchema.safeParse({
          ...formData,
          id: modal.assignee.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateAssignee({ data: parsed.data });
      }

      setModal(null);
      await onChanged();
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

  async function handleDelete(assignee: AssigneeRow) {
    if (
      !window.confirm(
        `「${assignee.name}」を削除しますか？（登録済みの案件の担当者名はそのまま残ります）`,
      )
    ) {
      return;
    }
    setListError(null);
    try {
      await deleteAssignee({ data: { id: assignee.id } });
      await onChanged();
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  return (
    <>
      {listError ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {listError}
        </p>
      ) : null}

      <Card
        title="担当者マスタ"
        count={`${assignees.length} 名`}
        actions={
          <button
            type="button"
            className={button({ size: "sm" })}
            onClick={() => {
              setFormError(null);
              setModal({ mode: "create" });
            }}
          >
            ＋ 新規登録
          </button>
        }
      >
        {assignees.length === 0 ? (
          <EmptyState message="担当者が登録されていません。登録すると、案件の担当者欄で選べるようになります。" />
        ) : (
          <RowList>
            {assignees.map((assignee) => (
              <Row
                key={assignee.id}
                actions={
                  <>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => {
                        setFormError(null);
                        setModal({ mode: "edit", assignee });
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => handleDelete(assignee)}
                    >
                      削除
                    </button>
                  </>
                }
              >
                <p className="font-medium break-words">{assignee.name}</p>
                <p className="mt-0.5 text-sm text-ink-faint tabular-nums">
                  並び順 {assignee.sortOrder}
                </p>
              </Row>
            ))}
          </RowList>
        )}
      </Card>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "担当者を編集" : "担当者を新規登録"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label="担当者名"
            required
            defaultValue={modal?.mode === "edit" ? modal.assignee.name : ""}
          />
          <TextField
            name="sortOrder"
            label="並び順（小さいほど先に表示）"
            defaultValue={
              modal?.mode === "edit" ? String(modal.assignee.sortOrder) : "0"
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
    </>
  );
}

function EmployeeSection({
  accounts,
  onChanged,
}: {
  accounts: Account[];
  onChanged: () => Promise<void>;
}) {
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; account: Account } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      if (modal.mode === "create") {
        const parsed = accountCreateInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createAccount({ data: parsed.data });
      } else {
        const parsed = accountUpdateInputSchema.safeParse({
          ...formData,
          id: modal.account.id,
          currentUsername: modal.account.username,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateAccount({ data: parsed.data });

        const newPassword =
          typeof formData.newPassword === "string" ? formData.newPassword : "";
        if (newPassword) {
          const passwordParsed = accountPasswordInputSchema.safeParse({
            id: modal.account.id,
            password: newPassword,
          });
          if (!passwordParsed.success) {
            setFormError(
              passwordParsed.error.issues[0]?.message ??
                "パスワードを確認してください。",
            );
            return;
          }
          await updateAccountPassword({ data: passwordParsed.data });
        }
      }

      setModal(null);
      await onChanged();
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

  async function handleDelete(account: Account) {
    if (!window.confirm(`「${account.name}」を削除しますか？`)) {
      return;
    }
    setListError(null);
    try {
      await deleteAccount({ data: { id: account.id } });
      await onChanged();
    } catch {
      setListError("削除に失敗しました。自分自身は削除できません。");
    }
  }

  return (
    <>
      {listError ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {listError}
        </p>
      ) : null}

      <Card
        title="社員マスタ"
        count={`${accounts.length} 名`}
        actions={
          <button
            type="button"
            className={button({ size: "sm" })}
            onClick={() => {
              setFormError(null);
              setModal({ mode: "create" });
            }}
          >
            ＋ 新規作成
          </button>
        }
      >
        <RowList>
          {accounts.map((account) => (
            <Row
              key={account.id}
              actions={
                <>
                  <button
                    type="button"
                    className={button({ variant: "ghost", size: "sm" })}
                    onClick={() => {
                      setFormError(null);
                      setModal({ mode: "edit", account });
                    }}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className={button({ variant: "ghost", size: "sm" })}
                    onClick={() => handleDelete(account)}
                  >
                    削除
                  </button>
                </>
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium break-words">{account.name}</p>
                <Badge tone={account.role === "admin" ? "accent" : "neutral"}>
                  {roleOptions.find((o) => o.value === account.role)?.label ??
                    account.role}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-ink-muted">
                @{account.username}
              </p>
            </Row>
          ))}
        </RowList>
      </Card>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "社員を編集" : "社員を新規作成"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label="名前"
            required
            defaultValue={modal?.mode === "edit" ? modal.account.name : ""}
          />
          <TextField
            name="username"
            label="アカウント名"
            required
            autoComplete="username"
            defaultValue={
              modal?.mode === "edit" ? (modal.account.username ?? "") : ""
            }
          />
          {modal?.mode === "create" ? (
            <TextField
              name="password"
              label="パスワード"
              type="password"
              required
              autoComplete="new-password"
            />
          ) : (
            <TextField
              name="newPassword"
              label="新しいパスワード（変更する場合のみ）"
              type="password"
              autoComplete="new-password"
            />
          )}
          <SelectField
            name="role"
            label="権限"
            options={roleOptions}
            defaultValue={
              modal?.mode === "edit" ? (modal.account.role ?? "user") : "user"
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
    </>
  );
}

function ShopSettingsSection({
  settings,
  onChanged,
}: {
  settings: Awaited<ReturnType<typeof getShopSettings>>;
  onChanged: () => Promise<void>;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setSaved(false);
    setPending(true);
    try {
      const parsed = shopSettingsInputSchema.safeParse(formData);
      if (!parsed.success) {
        setFormError(
          parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
        );
        return;
      }
      await updateShopSettings({ data: parsed.data });
      setSaved(true);
      await onChanged();
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

  return (
    <Card title="会社設定">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-5">
        <p className="text-sm text-ink-muted">
          見積・請求書に印字する自社情報と、既定の消費税率を設定します。
        </p>

        <TextField
          name="companyName"
          label="会社名"
          defaultValue={settings.companyName ?? ""}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="postalCode"
            label="郵便番号"
            defaultValue={settings.postalCode ?? ""}
          />
          <TextField
            name="building"
            label="建物"
            defaultValue={settings.building ?? ""}
          />
        </div>
        <TextField
          name="address"
          label="住所"
          defaultValue={settings.address ?? ""}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="phone"
            label="電話番号"
            defaultValue={settings.phone ?? ""}
          />
          <TextField
            name="fax"
            label="ファックス番号"
            defaultValue={settings.fax ?? ""}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="website"
            label="ウェブサイト"
            defaultValue={settings.website ?? ""}
          />
          <TextField
            name="email"
            label="メールアドレス"
            type="email"
            defaultValue={settings.email ?? ""}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            name="taxRate"
            label="基本税率(%)"
            defaultValue={String(settings.taxRate)}
          />
          <TextField
            name="invoiceNumber"
            label="インボイス登録番号"
            defaultValue={settings.invoiceNumber ?? ""}
          />
        </div>
        <TextField
          name="logoUrl"
          label="ロゴ画像のURL（帳票に印字されます）"
          defaultValue={settings.logoUrl ?? ""}
        />
        <TextField
          name="bankInfo"
          label="振込先"
          multiline
          rows={3}
          defaultValue={settings.bankInfo ?? ""}
        />

        {formError ? (
          <p className="text-sm text-danger" role="alert">
            {formError}
          </p>
        ) : null}
        {saved && !formError ? (
          <p className="text-sm text-success">保存しました。</p>
        ) : null}

        <button
          type="submit"
          className={button({ className: "sm:w-auto sm:self-start" })}
          disabled={pending}
        >
          {pending ? "保存中..." : "保存"}
        </button>
      </form>
    </Card>
  );
}
