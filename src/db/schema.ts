import {
  date,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// better-auth CLI (`pnpm auth:schema`) が生成する認証テーブル定義。
// 手で編集せず、認証設定を変えたら再生成する。
export * from "./auth-schema";

/**
 * 備品の貸出記録。
 *
 * 「返却」しても行は削除せず returnedAt に日時を入れる（履歴を残すため）。
 * 一覧に出すのは returnedAt が null のもの＝貸出中のものだけ。
 */
export const equipmentLoans = pgTable(
  "equipment_loans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemName: varchar("item_name", { length: 60 }).notNull(),
    borrower: varchar("borrower", { length: 40 }).notNull(),
    // 日付のみを扱うため timestamp ではなく date を使う（時差の影響を受けない）
    lentOn: date("lent_on").notNull(),
    returnedAt: timestamp("returned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // 貸出中の一覧（returnedAt is null を貸出日順）を引くための索引
    index("equipment_loans_returned_at_lent_on_idx").on(
      table.returnedAt,
      table.lentOn,
    ),
  ],
);

export type EquipmentLoan = typeof equipmentLoans.$inferSelect;

/** 備品マスタ。貸出登録で選ぶ備品名の一覧。 */
export const equipmentItems = pgTable("equipment_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 60 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type EquipmentItem = typeof equipmentItems.$inferSelect;

/** 顧客マスタ。会社名・個人名、担当者の連絡先、住所を管理する。現時点では他機能とは連携しない。 */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  contactName: varchar("contact_name", { length: 60 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: varchar("address", { length: 200 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type Customer = typeof customers.$inferSelect;
