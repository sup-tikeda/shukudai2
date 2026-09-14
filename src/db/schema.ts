import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// better-auth CLI (`pnpm auth:schema`) が生成する認証テーブル定義。
// 手で編集せず、認証設定を変えたら再生成する。
export * from "./auth-schema";

/**
 * 顧客。バイクショップの受付管理における中心的なマスタ。
 * 1顧客は複数の車両（バイク）を保有できる。
 */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  contactName: varchar("contact_name", { length: 60 }),
  postalCode: varchar("postal_code", { length: 10 }),
  address: varchar("address", { length: 200 }),
  addressLine2: varchar("address_line2", { length: 200 }),
  building: varchar("building", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  mobilePhone: varchar("mobile_phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  licenseNumber: varchar("license_number", { length: 50 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type Customer = typeof customers.$inferSelect;

/** 車両（バイク）。顧客が保有する1台ごとのレコード。 */
export const vehicles = pgTable("vehicles", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  vehicleNumber: varchar("vehicle_number", { length: 50 }),
  maker: varchar("maker", { length: 30 }),
  displacement: integer("displacement"),
  modelYear: integer("model_year"),
  color: varchar("color", { length: 30 }),
  registeredOn: date("registered_on"),
  inspectionExpiresOn: date("inspection_expires_on"),
  insuranceInfo: text("insurance_info"),
  accidentHistory: text("accident_history"),
  customizationInfo: text("customization_info"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type Vehicle = typeof vehicles.$inferSelect;

/** 案件（整備・修理・点検などの作業案件）。1台の車両に対して複数発生しうる。 */
export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  vehicleId: uuid("vehicle_id")
    .notNull()
    .references(() => vehicles.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("未作業"),
  content: text("content"),
  assignee: varchar("assignee", { length: 30 }),
  plannedStartOn: date("planned_start_on"),
  plannedEndOn: date("planned_end_on"),
  workContent: text("work_content"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type Case = typeof cases.$inferSelect;

/** 見積書・請求書。1つの案件に対して複数発生しうる（見積→請求と分けて発行するため）。 */
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 帳票に印字する書類番号。UUIDは人が読み上げられないため、別に連番を持つ
  docNumber: serial("doc_number").notNull(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }),
  docType: varchar("doc_type", { length: 10 }).notNull().default("見積書"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(10),
  note: text("note"),
  createdOn: date("created_on").notNull().defaultNow(),
  sentOn: date("sent_on"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type Quote = typeof quotes.$inferSelect;

/** 見積・請求の明細項目。税抜金額・税込金額は保存せず、都度 数量×単価 から計算する。 */
export const quoteItems = pgTable("quote_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => quotes.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type QuoteItem = typeof quoteItems.$inferSelect;

/** 店舗設定。会社情報・基本税率など。全体で1レコードのみを想定する。 */
export const shopSettings = pgTable("shop_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyName: varchar("company_name", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  address: varchar("address", { length: 200 }),
  building: varchar("building", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  fax: varchar("fax", { length: 30 }),
  website: varchar("website", { length: 200 }),
  email: varchar("email", { length: 255 }),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(10),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
  bankInfo: text("bank_info"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type ShopSettings = typeof shopSettings.$inferSelect;
