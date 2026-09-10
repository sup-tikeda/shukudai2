import { z } from "zod";

/**
 * サーバー側でのみ読み込むこと。クライアントコンポーネントから import すると
 * シークレットがバンドルに含まれる恐れがあるため使用しない。
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(16, "BETTER_AUTH_SECRET is too short"),
  BETTER_AUTH_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  MAIL_FROM: z.string().min(1),
  CONTACT_NOTIFY_TO: z.email(),
});

export const env = envSchema.parse(process.env);
