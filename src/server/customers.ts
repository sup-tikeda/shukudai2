import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { customers } from "~/db/schema";
import { db } from "~/lib/db";
import { requireAdminSession } from "~/server/authGuard";
import {
  customerIdSchema,
  customerInputSchema,
  customerUpdateInputSchema,
} from "~/lib/validation";

/** 顧客マスタの一覧（作成日時の古い順） */
export const listCustomers = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdminSession();

    return db.select().from(customers).orderBy(asc(customers.createdAt));
  },
);

/** 顧客マスタを新規作成する */
export const createCustomer = createServerFn({ method: "POST" })
  .validator(customerInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db.insert(customers).values(data);
  });

/** 顧客マスタを更新する */
export const updateCustomer = createServerFn({ method: "POST" })
  .validator(customerUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    const { id, ...values } = data;
    await db.update(customers).set(values).where(eq(customers.id, id));
  });

/** 顧客マスタを削除する */
export const deleteCustomer = createServerFn({ method: "POST" })
  .validator(customerIdSchema)
  .handler(async ({ data }) => {
    await requireAdminSession();

    await db.delete(customers).where(eq(customers.id, data.id));
  });
