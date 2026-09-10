import nodemailer from "nodemailer";
import { env } from "./env";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  // 認証情報が未設定のローカル開発では認証なしで接続する
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
}) {
  return transporter.sendMail({
    from: env.MAIL_FROM,
    ...options,
  });
}
