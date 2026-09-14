import { useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { button, Modal, SelectField, TextField } from "~/components/ui/form";
import {
  AppShell,
  Badge,
  Card,
  PageHeader,
  Row,
  RowList,
} from "~/components/ui/layout";
import { calculateAge, isRetired } from "~/lib/staff";
import {
  accountCreateInputSchema,
  accountPasswordInputSchema,
  accountUpdateInputSchema,
  postalCodeSchema,
  shopSettingsInputSchema,
  staffProfileInputSchema,
} from "~/lib/validation";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  saveStaffProfile,
  updateAccount,
  updateAccountPassword,
} from "~/server/accounts";
import { lookupAddress } from "~/server/postal";
import { getShopSettings, updateShopSettings } from "~/server/shopSettings";

export const Route = createFileRoute("/master")({
  // 未ログイン、もしくはadmin以外はサーバー側でリダイレクトされる
  loader: async () => ({
    accounts: await listAccounts(),
    shopSettings: await getShopSettings(),
  }),
  component: MasterPage,
});

type Account = Awaited<ReturnType<typeof listAccounts>>[number];

const roleOptions = [
  { value: "admin", label: "管理者" },
  { value: "user", label: "一般" },
];

/** 役職の入力候補。手入力もできるよう、候補として出すだけにしている */
const positionSuggestions = ["店長", "副店長", "整備士", "受付", "アルバイト"];

/** 生年月日から「42歳」の形にする。未入力なら何も出さない */
function describeAge(birthday: string | null | undefined) {
  const age = calculateAge(birthday);
  return age === null ? null : `${age}歳`;
}

type Tab = "shopSettings" | "employees";

// いちばん最初に整える設定なので、会社設定を先頭に置く
const tabs: { value: Tab; label: string }[] = [
  { value: "shopSettings", label: "会社設定" },
  { value: "employees", label: "社員マスタ" },
];

function MasterPage() {
  const { accounts, shopSettings } = Route.useLoaderData();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("shopSettings");

  async function reload() {
    await router.invalidate();
  }

  return (
    <AppShell>
      <PageHeader
        title="設定"
        subtitle="見積・請求書に印字する自社情報と、ログインアカウント（＝案件の担当者）を管理します。"
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
          {tab === "shopSettings" ? (
            <ShopSettingsSection settings={shopSettings} onChanged={reload} />
          ) : (
            <EmployeeSection accounts={accounts} onChanged={reload} />
          )}
        </div>
      </div>
    </AppShell>
  );
}

function EmployeeSection({
  accounts,
  onChanged,
}: {
  accounts: Account[];
  onChanged: () => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; account: Account } | null
  >(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [addressPending, setAddressPending] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  /** 郵便番号から住所を引いて、住所欄に流し込む（顧客の登録画面と同じ仕組み） */
  async function handleLookupAddress() {
    const form = formRef.current;
    if (!form) return;

    const postalCode = new FormData(form).get("postalCode");
    const parsed = postalCodeSchema.safeParse({ postalCode });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? null);
      return;
    }

    setFormError(null);
    setAddressPending(true);
    try {
      const { address } = await lookupAddress({ data: parsed.data });
      const field = form.elements.namedItem("address");
      if (field instanceof HTMLInputElement) {
        field.value = address;
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "住所を取得できませんでした。",
      );
    } finally {
      setAddressPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      // 詳細情報は作成・編集のどちらでも同じ内容を保存するため、先にまとめて検証する
      const profileParsed = staffProfileInputSchema.safeParse(formData);
      if (!profileParsed.success) {
        setFormError(
          profileParsed.error.issues[0]?.message ??
            "入力内容を確認してください。",
        );
        return;
      }

      if (modal.mode === "create") {
        const parsed = accountCreateInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        const created = await createAccount({ data: parsed.data });
        if (created.id) {
          await saveStaffProfile({
            data: { ...profileParsed.data, userId: created.id },
          });
        }
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
        await saveStaffProfile({
          data: { ...profileParsed.data, userId: modal.account.id },
        });

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
                {account.nameKana ? (
                  <span className="text-xs text-ink-faint">
                    （{account.nameKana}）
                  </span>
                ) : null}
                <Badge tone={account.role === "admin" ? "accent" : "neutral"}>
                  {roleOptions.find((o) => o.value === account.role)?.label ??
                    account.role}
                </Badge>
                {/* 退職者は一覧でもすぐ分かるようにする（担当者には選べなくなるため） */}
                {isRetired(account.retiredOn) ? (
                  <Badge>退職（{account.retiredOn}）</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-ink-muted break-words">
                {[
                  `@${account.username}`,
                  account.position,
                  describeAge(account.birthday),
                  account.hiredOn ? `入社 ${account.hiredOn}` : null,
                ]
                  .filter(Boolean)
                  .join(" ／ ")}
              </p>
              {account.qualification || account.mobilePhone ? (
                <p className="mt-0.5 text-xs text-ink-faint break-words">
                  {[account.qualification, account.mobilePhone]
                    .filter(Boolean)
                    .join(" ／ ")}
                </p>
              ) : null}
            </Row>
          ))}
        </RowList>
      </Card>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "社員を編集" : "社員を新規作成"}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
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

          <hr className="border-line" />
          <p className="text-xs text-ink-faint">
            以下は社員の詳細情報です。個人情報にあたるため、閲覧・編集は管理者のみに限っています。
          </p>

          <TextField
            name="nameKana"
            label="ふりがな"
            defaultValue={
              modal?.mode === "edit" ? (modal.account.nameKana ?? "") : ""
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="position"
              label="役職"
              suggestions={positionSuggestions}
              defaultValue={
                modal?.mode === "edit" ? (modal.account.position ?? "") : ""
              }
            />
            <TextField
              name="qualification"
              label="保有資格"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.qualification ?? "") : ""
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="birthday"
              label="生年月日（年齢は自動計算）"
              type="date"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.birthday ?? "") : ""
              }
            />
            <TextField
              name="hiredOn"
              label="入社日"
              type="date"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.hiredOn ?? "") : ""
              }
            />
          </div>
          <TextField
            name="retiredOn"
            label="退職日（空欄なら在職中。入れると担当者に選べなくなります）"
            type="date"
            defaultValue={
              modal?.mode === "edit" ? (modal.account.retiredOn ?? "") : ""
            }
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextField
              name="postalCode"
              label="郵便番号"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.postalCode ?? "") : ""
              }
            />
            <button
              type="button"
              className={button({ variant: "outline" })}
              onClick={handleLookupAddress}
              disabled={addressPending}
            >
              {addressPending ? "取得中..." : "郵便番号から住所を入力"}
            </button>
          </div>
          <TextField
            name="address"
            label="住所"
            defaultValue={
              modal?.mode === "edit" ? (modal.account.address ?? "") : ""
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="addressLine2"
              label="番地以降"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.addressLine2 ?? "") : ""
              }
            />
            <TextField
              name="building"
              label="建物・部屋番号"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.building ?? "") : ""
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="phone"
              label="電話番号"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.phone ?? "") : ""
              }
            />
            <TextField
              name="mobilePhone"
              label="携帯番号"
              defaultValue={
                modal?.mode === "edit" ? (modal.account.mobilePhone ?? "") : ""
              }
            />
          </div>
          <TextField
            name="email"
            label="連絡先メールアドレス"
            type="email"
            defaultValue={
              modal?.mode === "edit" ? (modal.account.email ?? "") : ""
            }
          />
          <TextField
            name="note"
            label="備考"
            multiline
            rows={2}
            defaultValue={
              modal?.mode === "edit" ? (modal.account.note ?? "") : ""
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
