import { useRef, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { button, Modal, TextField } from "~/components/ui/form";
import {
  AppShell,
  Card,
  EmptyState,
  ListToolbar,
  matchesQuery,
  PageHeader,
  Row,
  RowList,
} from "~/components/ui/layout";
import { customerInputSchema, customerUpdateInputSchema } from "~/lib/validation";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
} from "~/server/customers";
import { lookupAddress } from "~/server/postal";

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
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [addressPending, setAddressPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  /**
   * 郵便番号から住所を引いて住所欄へ入れる（元FileMakerの「住所入力」と同じ動作）。
   * 外部APIへの負荷を避けるため、入力のたびではなくボタンを押した時だけ呼ぶ。
   */
  async function handleLookupAddress() {
    const form = formRef.current;
    if (!form) return;
    const postalCode = new FormData(form).get("postalCode");

    setFormError(null);
    setAddressPending(true);
    try {
      const { address } = await lookupAddress({
        data: { postalCode: String(postalCode ?? "") },
      });
      const addressInput = form.elements.namedItem("address");
      if (addressInput instanceof HTMLInputElement) {
        addressInput.value = address;
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "住所の検索に失敗しました。",
      );
    } finally {
      setAddressPending(false);
    }
  }

  // 絞り込みと並べ替えは画面側で行う（件数が多くないため、入力即反映を優先）
  const visibleCustomers = customers
    .filter((c) =>
      matchesQuery(query, [
        c.name,
        c.phone,
        c.mobilePhone,
        c.email,
        c.address,
        c.contactName,
      ]),
    )
    .sort((a, b) =>
      sortKey === "newest"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : a.name.localeCompare(b.name, "ja"),
    );

  async function reload() {
    await router.invalidate();
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
    if (
      !window.confirm(`「${customer.name}」を削除しますか？（保有車両も削除されます）`)
    ) {
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
    <AppShell>
      <PageHeader
        title="顧客"
        subtitle="来店・整備の起点となる顧客情報を管理します。"
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
      />

      {listError ? (
        <p className="mb-4 text-sm text-danger" role="alert">
          {listError}
        </p>
      ) : null}

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder="顧客名・電話番号・住所で絞り込み"
        sortKey={sortKey}
        onSortChange={setSortKey}
        sortOptions={[
          { value: "name", label: "名前順" },
          { value: "newest", label: "登録が新しい順" },
        ]}
      />

      <Card
        title="顧客一覧"
        count={
          query
            ? `${visibleCustomers.length} / ${customers.length} 名`
            : `${customers.length} 名`
        }
      >
        {visibleCustomers.length === 0 ? (
          <EmptyState
            message={
              customers.length === 0
                ? "顧客が登録されていません。「＋ 新規登録」から追加してください。"
                : "条件に合う顧客が見つかりませんでした。"
            }
          />
        ) : (
          <RowList>
            {visibleCustomers.map((customer) => (
              <Row
                key={customer.id}
                actions={
                  <>
                    <Link
                      to="/customers/$id"
                      params={{ id: customer.id }}
                      className={button({ variant: "outline", size: "sm" })}
                    >
                      詳細
                    </Link>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => {
                        setFormError(null);
                        setModal({ mode: "edit", customer });
                      }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => handleDelete(customer)}
                    >
                      削除
                    </button>
                  </>
                }
              >
                <p className="font-medium break-words">{customer.name}</p>
                <p className="mt-0.5 text-sm text-ink-muted break-words">
                  {[customer.phone, customer.mobilePhone, customer.email]
                    .filter(Boolean)
                    .join(" ／ ") || "連絡先未登録"}
                </p>
              </Row>
            ))}
          </RowList>
        )}
      </Card>

      <Modal
        open={modal !== null}
        onOpenChange={(open) => !open && setModal(null)}
        title={modal?.mode === "edit" ? "顧客を編集" : "顧客を新規登録"}
      >
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
        >
          <TextField
            name="name"
            label="顧客名"
            required
            defaultValue={modal?.mode === "edit" ? modal.customer.name : ""}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
          <TextField
            name="email"
            label="メールアドレス"
            type="email"
            defaultValue={
              modal?.mode === "edit" ? (modal.customer.email ?? "") : ""
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              name="postalCode"
              label="郵便番号"
              defaultValue={
                modal?.mode === "edit" ? (modal.customer.postalCode ?? "") : ""
              }
            />
            <TextField
              name="licenseNumber"
              label="免許証番号"
              defaultValue={
                modal?.mode === "edit"
                  ? (modal.customer.licenseNumber ?? "")
                  : ""
              }
            />
          </div>
          <div className="flex flex-col gap-2">
            <TextField
              name="address"
              label="住所"
              defaultValue={
                modal?.mode === "edit" ? (modal.customer.address ?? "") : ""
              }
            />
            <button
              type="button"
              onClick={handleLookupAddress}
              disabled={addressPending}
              className={button({
                variant: "outline",
                size: "sm",
                className: "self-start",
              })}
            >
              {addressPending ? "検索中..." : "郵便番号から住所を入力"}
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>
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
