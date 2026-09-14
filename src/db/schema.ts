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
// 社員の詳細情報から外部キーで参照するため、値としても取り込む
import { user } from "./auth-schema";

/**
 * 顧客。バイクショップの受付管理における中心的なマスタ。
 * 1顧客は複数の車両（バイク）を保有できる。
 */
export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 電話口や書類で使う顧客番号。UUIDは人が扱えないため、別に連番を持つ
  customerNumber: serial("customer_number").notNull().unique(),
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
  // 店内で1台を特定するための管理番号（連番）。
  // 下の `vehicleNumber`（ナンバープレート）とは別物なので名前を分けている。
  manageNumber: serial("manage_number").notNull().unique(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  // ナンバープレートの番号。未登録車や書類待ちで空のこともある
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
  // 画面や電話口で読み上げる案件番号。UUIDは人が扱えないため、別に連番を持つ
  // （見積・請求の書類番号と同じ考え方）
  caseNumber: serial("case_number").notNull().unique(),
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
  docNumber: serial("doc_number").notNull().unique(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 100 }),
  docType: varchar("doc_type", { length: 10 }).notNull().default("見積書"),
  // 明細を追加するときの既定値。実際の課税は明細ごとの税率で計算する
  taxRate: numeric("tax_rate", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(10),
  // 帳票に印字される通信欄。お客様の目に触れる
  note: text("note"),
  // 社内用のメモ。帳票には出さない（値引きの経緯など、客先に見せない内容を書く）
  internalNote: text("internal_note"),
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
  // 明細ごとの消費税率。軽減税率（8%）と標準税率（10%）が1枚に混在しても正しく計算するため
  taxRate: numeric("tax_rate", { precision: 5, scale: 2, mode: "number" })
    .notNull()
    .default(10),
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
  // 帳票に印字するロゴ。画像ファイルの保管場所を持たないため、URLで指定する
  logoUrl: varchar("logo_url", { length: 500 }),
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

/**
 * 社員の詳細情報。ログインアカウント（better-auth の `user`）と1対1で持つ。
 *
 * `user` テーブルは better-auth CLI が生成するもので、認証設定を変えると作り直される。
 * 項目を足すたびに消えては困るため、業務で使う情報はこちらに分けている。
 * アカウントを削除したら詳細も一緒に消す（連鎖削除）。
 *
 * 年齢は保存せず生年月日だけを持ち、表示のたびに計算する（保存すると毎年ずれるため）。
 *
 * ここには氏名・生年月日・住所といった個人情報が入る。実在の従業員の情報を扱う場合は、
 * 閲覧できる人の範囲と保存期間を決めたうえで運用すること（現状は admin のみ閲覧・編集可）。
 */
export const staffProfiles = pgTable("staff_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nameKana: varchar("name_kana", { length: 60 }),
  birthday: date("birthday"),
  hiredOn: date("hired_on"),
  // 退職日。入っていれば「退職」、空なら「在職中」として扱う。
  // 単なる在職フラグではなく日付にしているのは、いつ退職したかも残したいため。
  // 退職した社員は案件の担当者の選択肢から外れるが、過去の案件に残った名前は変わらない。
  retiredOn: date("retired_on"),
  position: varchar("position", { length: 30 }),
  qualification: varchar("qualification", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  address: varchar("address", { length: 200 }),
  addressLine2: varchar("address_line2", { length: 200 }),
  building: varchar("building", { length: 100 }),
  phone: varchar("phone", { length: 30 }),
  mobilePhone: varchar("mobile_phone", { length: 30 }),
  // 連絡先のメールアドレス。ログイン用のメールとは別に持つ
  email: varchar("email", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date()),
});

export type StaffProfile = typeof staffProfiles.$inferSelect;
