import { createServerFn } from "@tanstack/react-start";
import { asc, count, eq } from "drizzle-orm";
import { cases, customers, vehicles } from "~/db/schema";
import { db } from "~/lib/db";
import { requireSession } from "~/server/authGuard";
import {
  vehicleIdSchema,
  vehicleInputSchema,
  vehicleUpdateInputSchema,
} from "~/lib/validation";

/** 車両の一覧（モデル名順）。所有者名と案件数をあわせて返す。 */
export const listVehicles = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select({
        id: vehicles.id,
        manageNumber: vehicles.manageNumber,
        modelName: vehicles.modelName,
        vehicleNumber: vehicles.vehicleNumber,
        maker: vehicles.maker,
        inspectionExpiresOn: vehicles.inspectionExpiresOn,
        customerId: vehicles.customerId,
        customerName: customers.name,
        // 一覧のためだけに関連レコード数を集計する（保存はしない）
        caseCount: count(cases.id),
      })
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .leftJoin(cases, eq(cases.vehicleId, vehicles.id))
      .groupBy(vehicles.id, customers.name)
      .orderBy(asc(vehicles.modelName));
  },
);

/** 車両名だけの一覧（案件登録フォームの選択肢用） */
export const listVehicleOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireSession();

    return db
      .select({
        id: vehicles.id,
        modelName: vehicles.modelName,
        customerName: customers.name,
      })
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .orderBy(asc(vehicles.modelName));
  },
);

/** 車両1件の詳細（所有者名を含む） */
export const getVehicle = createServerFn({ method: "GET" })
  .validator(vehicleIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [vehicle] = await db
      .select({
        id: vehicles.id,
        manageNumber: vehicles.manageNumber,
        customerId: vehicles.customerId,
        customerName: customers.name,
        modelName: vehicles.modelName,
        vehicleNumber: vehicles.vehicleNumber,
        maker: vehicles.maker,
        displacement: vehicles.displacement,
        modelYear: vehicles.modelYear,
        color: vehicles.color,
        registeredOn: vehicles.registeredOn,
        inspectionExpiresOn: vehicles.inspectionExpiresOn,
        insuranceInfo: vehicles.insuranceInfo,
        accidentHistory: vehicles.accidentHistory,
        customizationInfo: vehicles.customizationInfo,
        note: vehicles.note,
      })
      .from(vehicles)
      .innerJoin(customers, eq(vehicles.customerId, customers.id))
      .where(eq(vehicles.id, data.id));
    if (!vehicle) {
      throw new Error("車両が見つかりません。");
    }
    return vehicle;
  });

/** 車両を新規作成する */
export const createVehicle = createServerFn({ method: "POST" })
  .validator(vehicleInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const [saved] = await db
      .insert(vehicles)
      .values(data)
      .returning({ id: vehicles.id });
    return { id: saved.id };
  });

/** 車両を更新する */
export const updateVehicle = createServerFn({ method: "POST" })
  .validator(vehicleUpdateInputSchema)
  .handler(async ({ data }) => {
    await requireSession();

    const { id, ...values } = data;
    await db.update(vehicles).set(values).where(eq(vehicles.id, id));
  });

/** 車両を削除する（関連する案件・見積・請求も連鎖して削除される） */
export const deleteVehicle = createServerFn({ method: "POST" })
  .validator(vehicleIdSchema)
  .handler(async ({ data }) => {
    await requireSession();

    await db.delete(vehicles).where(eq(vehicles.id, data.id));
  });
