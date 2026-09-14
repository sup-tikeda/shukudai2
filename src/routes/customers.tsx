import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, TextField } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";
import { customerInputSchema, customerUpdateInputSchema } from "~/lib/validation";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "~/server/customers";

export const Route = createFileRoute("/customers")({
  // 未ログインの場合、listCustomers がサーバー側で /login へリダイレクトする
  loader: () => listCustomers(),
  component: CustomersPage,
});

type Customer = Awaited<ReturnType<typeof listCustomers>>[number];

function CustomersPage() {
  const customers = Route.useLoaderData();
  const router = useRouter();

  const [modal, setModal] = useState<
    { mode: "create" } | { mode: "edit"; customer: Customer } | null
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!modal) return;
    const formData = Object.fromEntries(new FormData(event.currentTarget));

    setFormError(null);
    setPending(true);
    try {
      if (modal.mode === "create") {
        const parsed = customerInputSchema.safeParse(formData);
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await createCustomer({ data: parsed.data });
      } else {
        const parsed = customerUpdateInputSchema.safeParse({
          ...formData,
          id: modal.customer.id,
        });
        if (!parsed.success) {
          setFormError(
            parsed.error.issues[0]?.message ?? "入力内容を確認してください。",
          );
          return;
        }
        await updateCustomer({ data: parsed.data });
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

  async function handleDelete(customer: Customer) {
    if (!window.confirm(`「${customer.name}」を削除しますか？（保有車両も削除されます）`)) {
      return;
    }
    setListError(null);
    try {
      await deleteCustomer({ data: { id: customer.id } });
      await reload();
    } catch {
      setListError("削除に失敗しました。");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm">
            <Link to="/" className="text-slate-500 underline">
              ← ダッシュボードへ
            </Link>
          </p>
          <h1 className="text-xl font-bold">顧客</h1>
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
          <h2 className="font-medium">顧客一覧（{customers.length} 件）</h2>
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

        {customers.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">顧客が登録されていません。</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-200">
            {customers.map((customer) => (
              <li
                key={customer.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words">{customer.name}</p>
                  <p className="text-sm text-slate-500 break-words">
                    {[customer.phone, customer.mobilePhone, customer.email]
                      .filter(Boolean)
                      .join(" ／ ") || "連絡先未登録"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    to="/customers/$id"
                    params={{ id: customer.id }}
                    className={button({ variant: "outline", size: "sm" })}
                  >
                    詳細
                  </Link>
                  <button
                    type="button"
                    className={button({ variant: "outline", size: "sm" })}
                    onClick={() => {
                      setFormError(null);
                      setModal({ mode: "edit", customer });
                    }}
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    className={button({ variant: "outline", size: "sm" })}
                    onClick={() => handleDelete(customer)}
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
        title={modal?.mode === "edit" ? "顧客を編集" : "顧客を新規作成"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label="顧客名"
            required
            defaultValue={modal?.mode === "edit" ? modal.customer.name : ""}
          />
          <TextField
            name="phone"
            label="電話番号"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.phone ?? "") : ""
            }
          />
          <TextField
            name="mobilePhone"
            label="携帯電話"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.mobilePhone ?? "") : ""
            }
          />
          <TextField
            name="email"
            label="メールアドレス"
            type="email"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.email ?? "") : ""
            }
          />
          <TextField
            name="postalCode"
            label="郵便番号"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.postalCode ?? "") : ""
            }
          />
          <TextField
            name="address"
            label="住所"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.address ?? "") : ""
            }
          />
          <TextField
            name="addressLine2"
            label="番地以降"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.addressLine2 ?? "") : ""
            }
          />
          <TextField
            name="building"
            label="建物"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.building ?? "") : ""
            }
          />
          <TextField
            name="licenseNumber"
            label="免許証番号"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.licenseNumber ?? "") : ""
            }
          />
          <TextField
            name="note"
            label="備考"
            multiline
            rows={3}
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.note ?? "") : ""
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
    </main>
  );
}
