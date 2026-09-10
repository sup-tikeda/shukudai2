import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  accountCreateInputSchema,
  accountPasswordInputSchema,
  accountUpdateInputSchema,
  equipmentItemInputSchema,
  equipmentItemUpdateInputSchema,
} from "~/lib/validation";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  updateAccountPassword,
} from "~/server/accounts";
import {
  createEquipmentItem,
  deleteEquipmentItem,
  listEquipmentItems,
  updateEquipmentItem,
} from "~/server/equipmentItems";

export const Route = createFileRoute("/master")({
  // 未ログイン、もしくはadmin以外はサーバー側でリダイレクトされる
  loader: async () => ({
    accounts: await listAccounts(),
    items: await listEquipmentItems(),
  }),
  component: MasterPage,
});

type Account = Awaited<ReturnType<typeof listAccounts>>[number];
type EquipmentItem = Awaited<ReturnType<typeof listEquipmentItems>>[number];

const roleOptions = [
  { value: "admin", label: "管理者" },
  { value: "user", label: "一般" },
];

function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Tab = "employees" | "items";

function MasterPage() {
  const { accounts, items } = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("employees");

  async function reload() {
    await router.invalidate();
  }

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-8">
      <p className="text-sm">
        <Link to="/" className="text-slate-500 underline">
          ← ダッシュボードへ
        </Link>
      </p>
      <h1 className="mt-1 text-xl font-bold">マスタ</h1>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <nav className="flex shrink-0 gap-2 sm:w-48 sm:flex-col">
          <button
            type="button"
            onClick={() => setTab("employees")}
            className={button({
              variant: tab === "employees" ? "primary" : "outline",
              className: "w-full",
            })}
          >
            社員マスタ
          </button>
          <button
            type="button"
            onClick={() => setTab("items")}
            className={button({
              variant: tab === "items" ? "primary" : "outline",
              className: "w-full",
            })}
          >
            備品マスタ
          </button>
        </nav>

        <div className="min-w-0 flex-1">
          {tab === "employees" ? (
            <EmployeeSection accounts={accounts} onChanged={reload} />
          ) : (
            <ItemSection items={items} onChanged={reload} />
          )}
        </div>
      </div>
    </main>
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
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">社員マスタ</h2>
        <button
          type="button"
          className={button({ size: "sm" })}
          onClick={() => {
            setFormError(null);
            setModal({ mode: "create" });
          }}
        >
          新規作成
        </button>
      </div>

      {listError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {listError}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-slate-200">
        {accounts.map((account) => (
          <li
            key={account.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium break-words">
                {account.name}（{account.username}）
              </p>
              <p className="text-sm text-slate-500">
                権限:{" "}
                {roleOptions.find((o) => o.value === account.role)?.label ??
                  account.role}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={button({ variant: "outline", size: "sm" })}
                onClick={() => {
                  setFormError(null);
                  setModal({ mode: "edit", account });
                }}
              >
                編集
              </button>
              <button
                type="button"
                className={button({ variant: "outline", size: "sm" })}
                onClick={() => handleDelete(account)}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>

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
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}

          <button type="submit" className={button()} disabled={pending}>
            {pending ? "保存中..." : "登録"}
          </button>
        </form>
      </Modal>
    </section>
  );
}

function ItemSection({
  items,
  onChanged,
}: {
  items: EquipmentItem[];
  onChanged: () => Promise<void>;
}) {
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; item: EquipmentItem } | null
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
        const parsed = equipmentItemInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createEquipmentItem({ data: parsed.data });
      } else {
        const parsed = equipmentItemUpdateInputSchema.safeParse({
          ...formData,
          id: modal.item.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateEquipmentItem({ data: parsed.data });
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

  async function handleDelete(item: EquipmentItem) {
    if (!window.confirm(`「${item.name}」を削除しますか？`)) {
      return;
    }
    setListError(null);
    try {
      await deleteEquipmentItem({ data: { id: item.id } });
      await onChanged();
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">備品マスタ</h2>
        <button
          type="button"
          className={button({ size: "sm" })}
          onClick={() => {
            setFormError(null);
            setModal({ mode: "create" });
          }}
        >
          新規作成
        </button>
      </div>

      {listError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {listError}
        </p>
      ) : null}

      <ul className="mt-4 divide-y divide-slate-200">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium break-words">{item.name}</p>
              <p className="text-sm text-slate-500">
                作成: {formatDateTime(item.createdAt)} ／ 更新:{" "}
                {formatDateTime(item.updatedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={button({ variant: "outline", size: "sm" })}
                onClick={() => {
                  setFormError(null);
                  setModal({ mode: "edit", item });
                }}
              >
                編集
              </button>
              <button
                type="button"
                className={button({ variant: "outline", size: "sm" })}
                onClick={() => handleDelete(item)}
              >
                削除
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "備品を編集" : "備品を新規作成"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label="備品名"
            required
            defaultValue={modal?.mode === "edit" ? modal.item.name : ""}
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
    </section>
  );
}
