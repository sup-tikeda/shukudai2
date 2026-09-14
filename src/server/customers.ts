import { createServerFn } from "@tanstack/react-start";
import { asc, count, eq } from "drizzle-orm";
import { customers, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";
import {
  customerIdSchema,
  customerInputSchema,
  customerUpdateInputSchema,
} from "~/lib/validation";

/**
 * 顧客の一覧（名前順）。受付業務で誰でも使うため、ログインしていれば閲覧・編集できる。
 * 一覧のまま顧客の規模が掴めるよう、保有台数もあわせて数える。
 */
export const listCustomers = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select({
        id: customers.id,
        customerNumber: customers.customerNumber,
        name: customers.name,
        contactName: customers.contactName,
        postalCode: customers.postalCode,
        address: customers.address,
        addressLine2: customers.addressLine2,
        building: customers.building,
        phone: customers.phone,
        mobilePhone: customers.mobilePhone,
        email: customers.email,
        licenseNumber: customers.licenseNumber,
        note: customers.note,
        createdAt: customers.createdAt,
        // 車両が1台も無い顧客も一覧に出すため leftJoin で数える
        vehicleCount: count(vehicles.id),
      })
      .from(customers)
      .leftJoin(vehicles, eq(vehicles.customerId, customers.id))
      .groupBy(customers.id)
      .orderBy(asc(customers.name));
  },
);

/** 顧客名だけの一覧（車両登録フォームの選択肢用） */
export const listCustomerOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .orderBy(asc(customers.name));
  },
);

/** 顧客1件の詳細 */
export const getCustomer = createServerFn({ method: "GET" })
  .validator(customerIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, data.id));
    if (!customer) {
      throw new Error("顧客が見つかりません。");
    }
    return customer;
  });

/** 顧客を新規作成する */
export const createCustomer = createServerFn({ method: "POST" })
  .validator(customerInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [saved] = await db
      .insert(customers)
      .values(data)
      .returning({ id: customers.id });
    return { id: saved.id };
  });

/** 顧客を更新する */
export const updateCustomer = createServerFn({ method: "POST" })
  .validator(customerUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const { id, ...values } = data;
    await db.update(customers).set(values).where(eq(customers.id, id));
  });

/** 顧客を削除する（保有車両も連鎖して削除される） */
export const deleteCustomer = createServerFn({ method: "POST" })
  .validator(customerIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    await db.delete(customers).where(eq(customers.id, data.id));
  });
