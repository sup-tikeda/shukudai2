import { z } from "zod";

// クライアント・サーバー双方から参照するため、シークレットを含む env は import しない。

/** 備品の貸出登録 */
export const loanInputSchema = z.object({
  itemName: z.string().trim().min(1, "備品名を入力してください").max(60),
  borrower: z.string().trim().min(1, "借りた人を入力してください").max(40),
  // <input type="date"> が送る "YYYY-MM-DD" 形式のみ受け付ける
  lentOn: z.iso.date("貸出日を入力してください"),
});

export type LoanInput = z.infer<typeof loanInputSchema>;

/** 返却（対象1件の指定） */
export const loanIdSchema = z.object({
  id: z.uuid(),
});

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

/** 備品マスタの管理（作成・編集） */
export const equipmentItemInputSchema = z.object({
  name: z.string().trim().min(1, "備品名を入力してください").max(60),
});

export const equipmentItemUpdateInputSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "備品名を入力してください").max(60),
});

export const equipmentItemIdSchema = z.object({
  id: z.uuid(),
});

/** 顧客マスタの管理（作成・編集） */
const customerOptionalTextSchema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "顧客名を入力してください").max(100),
  contactName: customerOptionalTextSchema,
  phone: customerOptionalTextSchema,
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, {
      message: "メールアドレスの形式が正しくありません",
    }),
  address: customerOptionalTextSchema,
});

export const customerUpdateInputSchema = customerInputSchema.extend({
  id: z.uuid(),
});

export const customerIdSchema = z.object({
  id: z.uuid(),
});
