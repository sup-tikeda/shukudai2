import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { cases, customers, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";
import { caseIdSchema, caseInputSchema, caseUpdateInputSchema } from "~/lib/validation";

/** 案件の一覧（開始予定日順）。車両名・所有者名をあわせて返す。 */
export const listCases = createServerFn({ method: "GET" }).handler(async () => {
  await requireSession();

  return db
    .select({
      id: cases.id,
      title: cases.title,
      status: cases.status,
      assignee: cases.assignee,
      plannedStartOn: cases.plannedStartOn,
      plannedEndOn: cases.plannedEndOn,
      vehicleId: cases.vehicleId,
      vehicleName: vehicles.modelName,
      customerName: customers.name,
    })
    .from(cases)
    .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
    .innerJoin(customers, eq(vehicles.customerId, customers.id))
    .orderBy(asc(cases.plannedStartOn));
});

/** 案件名だけの一覧（見積・請求登録フォームの選択肢用） */
export const listCaseOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select({
        id: cases.id,
        title: cases.title,
        vehicleName: vehicles.modelName,
      })
      .from(cases)
      .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
      .orderBy(asc(cases.title));
  },
);

/** 案件1件の詳細（車両名・所有者名を含む） */
export const getCase = createServerFn({ method: "GET" })
  .validator(caseIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [item] = await db
      .select({
        id: cases.id,
        vehicleId: cases.vehicleId,
        vehicleName: vehicles.modelName,
        customerName: customers.name,
        title: cases.title,
        status: cases.status,
        content: cases.content,
        assignee: cases.assignee,
        plannedStartOn: cases.plannedStartOn,
        plannedEndOn: cases.plannedEndOn,
        workContent: cases.workContent,
        note: cases.note,
      })
      .from(cases)
      .innerJoin(vehicles, eq(cases.vehicleId, vehicles.id))
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(eq(cases.id, data.id));
    if (!item) {
      throw new Error("案件が見つかりません。");
    }
    return item;
  });

/** 案件を新規作成する */
export const createCase = createServerFn({ method: "POST" })
  .validator(caseInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [saved] = await db
      .insert(cases)
      .values(data)
      .returning({ id: cases.id });
    return { id: saved.id };
  });

/** 案件を更新する */
export const updateCase = createServerFn({ method: "POST" })
  .validator(caseUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const { id, ...values } = data;
    await db.update(cases).set(values).where(eq(cases.id, id));
  });

/** 案件を削除する（関連する見積・請求も連鎖して削除される） */
export const deleteCase = createServerFn({ method: "POST" })
  .validator(caseIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    await db.delete(cases).where(eq(cases.id, data.id));
  });
