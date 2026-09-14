import { z } from "zod";

// クライアント・サーバー双方から参照するため、シークレットを含む env は import しない。

export const inquiryInputSchema = z.object({
  name: z.string().trim().min(1, "お名前を入力してください").max(100),
  email: z.email("メールアドレスの形式が正しくありません").max(255),
  subject: z.string().trim().min(1, "件名を入力してください").max(200),
  message: z.string().trim().min(1, "本文を入力してください").max(5000),
});

export type InquiryInput = z.infer<typeof inquiryInputSchema>;

export const loginInputSchema = z.object({
  username: z.string().trim().min(1, "アカウント名を入力してください"),
  password: z.string().min(8, "パスワードは8文字以上です"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

/** ログインアカウントの管理（作成・編集） */
export const accountRoleValues = ["admin", "user"] as const;

const accountUsernameSchema = z
  .string()
  .trim()
  .min(3, "アカウント名は3文字以上です")
  .max(30, "アカウント名は30文字以内です")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "アカウント名は半角英数字とアンダースコアのみです",
  );

const accountPasswordSchema = z.string().min(8, "パスワードは8文字以上です");

export const accountCreateInputSchema = z.object({
  name: z.string().trim().min(1, "名前を入力してください").max(50),
  username: accountUsernameSchema,
  password: accountPasswordSchema,
  role: z.enum(accountRoleValues),
});

export type AccountCreateInput = z.infer<typeof accountCreateInputSchema>;

export const accountUpdateInputSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "名前を入力してください").max(50),
  username: accountUsernameSchema,
  // 変更検知用。今のアカウント名と同じなら更新データに含めない（後述の理由でサーバー側が使う）
  currentUsername: z.string(),
  role: z.enum(accountRoleValues),
});

export type AccountUpdateInput = z.infer<typeof accountUpdateInputSchema>;

export const accountPasswordInputSchema = z.object({
  id: z.string().min(1),
  password: accountPasswordSchema,
});

export const accountIdSchema = z.object({
  id: z.string().min(1),
});

// ---- 以下、バイクショップ店舗管理（顧客・車両・案件・見積・請求）----

/** 空文字を送ってきた任意入力欄を undefined に正規化する（DBにはNULLとして入る） */
function optionalText(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((v) => (v ? v : undefined));
}

/** 空文字は許容しつつ、値がある場合だけ日付形式を検証する（未定・未入力を表すため） */
const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || z.iso.date().safeParse(v).success, {
    message: "日付の形式が正しくありません",
  });

/** 顧客マスタの管理（作成・編集） */
export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "顧客名を入力してください").max(100),
  contactName: optionalText(60),
  postalCode: optionalText(10),
  address: optionalText(200),
  addressLine2: optionalText(200),
  building: optionalText(100),
  phone: optionalText(30),
  mobilePhone: optionalText(30),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, {
      message: "メールアドレスの形式が正しくありません",
    }),
  licenseNumber: optionalText(50),
  note: optionalText(2000),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;

export const customerUpdateInputSchema = customerInputSchema.extend({
  id: z.uuid(),
});

export const customerIdSchema = z.object({
  id: z.uuid(),
});

/** 車両マスタの管理（作成・編集） */
export const vehicleInputSchema = z.object({
  customerId: z.uuid("所有者を選択してください"),
  modelName: z.string().trim().min(1, "モデル名を入力してください").max(100),
  vehicleNumber: optionalText(50),
  maker: optionalText(30),
  displacement: z.coerce
    .number()
    .int()
    .positive()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  modelYear: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  color: optionalText(30),
  registeredOn: optionalDate,
  inspectionExpiresOn: optionalDate,
  insuranceInfo: optionalText(2000),
  accidentHistory: optionalText(2000),
  customizationInfo: optionalText(2000),
  note: optionalText(2000),
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export const vehicleUpdateInputSchema = vehicleInputSchema.extend({
  id: z.uuid(),
});

export const vehicleIdSchema = z.object({
  id: z.uuid(),
});

/** 案件（整備・修理）の管理（作成・編集） */
export const caseStatusValues = ["未作業", "作業中", "完了済み"] as const;

export const caseInputSchema = z.object({
  vehicleId: z.uuid("対象の車両を選択してください"),
  title: z.string().trim().min(1, "案件名を入力してください").max(100),
  status: z.enum(caseStatusValues),
  content: optionalText(2000),
  assignee: optionalText(30),
  plannedStartOn: optionalDate,
  plannedEndOn: optionalDate,
  workContent: optionalText(2000),
  note: optionalText(2000),
});

export type CaseInput = z.infer<typeof caseInputSchema>;

export const caseUpdateInputSchema = caseInputSchema.extend({
  id: z.uuid(),
});

export const caseIdSchema = z.object({
  id: z.uuid(),
});

/** 見積・請求の管理（作成・編集） */
export const quoteDocTypeValues = ["見積書", "請求書"] as const;

export const quoteInputSchema = z.object({
  caseId: z.uuid("対象の案件を選択してください"),
  title: optionalText(100),
  docType: z.enum(quoteDocTypeValues),
  taxRate: z.coerce.number().min(0).max(100),
  note: optionalText(2000),
  sentOn: optionalDate,
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;

export const quoteUpdateInputSchema = quoteInputSchema.extend({
  id: z.uuid(),
});

export const quoteIdSchema = z.object({
  id: z.uuid(),
});

/** 見積・請求の明細項目の管理（作成・編集） */
export const quoteItemInputSchema = z.object({
  quoteId: z.uuid(),
  name: z.string().trim().min(1, "項目名を入力してください").max(100),
  quantity: z.coerce.number().int().min(1, "1以上の数値を入力してください"),
  unitPrice: z.coerce.number().int().min(0, "0以上の数値を入力してください"),
});

export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;

export const quoteItemUpdateInputSchema = quoteItemInputSchema
  .omit({ quoteId: true })
  .extend({
    id: z.uuid(),
  });

export const quoteItemIdSchema = z.object({
  id: z.uuid(),
});

/** 店舗設定（会社情報）の管理 */
export const shopSettingsInputSchema = z.object({
  companyName: optionalText(100),
  postalCode: optionalText(10),
  address: optionalText(200),
  building: optionalText(100),
  phone: optionalText(30),
  fax: optionalText(30),
  website: optionalText(200),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, {
      message: "メールアドレスの形式が正しくありません",
    }),
  logoUrl: optionalText(500),
  taxRate: z.coerce.number().min(0).max(100),
  invoiceNumber: optionalText(50),
  bankInfo: optionalText(500),
});

export type ShopSettingsInput = z.infer<typeof shopSettingsInputSchema>;

/** 郵便番号から住所を引くときの入力（ハイフンあり・なしどちらも受け付ける） */
export const postalCodeSchema = z.object({
  postalCode: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^0-9]/g, ""))
    .refine((v) => v.length === 7, {
      message: "郵便番号は7桁で入力してください",
    }),
});
