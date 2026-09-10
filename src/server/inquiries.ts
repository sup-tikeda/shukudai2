import { createServerFn } from "@tanstack/react-start";
import { env } from "~/lib/env";
import { sendMail } from "~/lib/mailer";
import { inquiryInputSchema } from "~/lib/validation";

// データベースを持たない構成のため、問い合わせは保存せず通知メールのみを送る。
// 送信に失敗した場合は利用者に再送を促す必要があるため、エラーはそのまま投げる。
export const submitInquiry = createServerFn({ method: "POST" })
  .validator(inquiryInputSchema)
  .handler(async ({ data }) => {
    await sendMail({
      to: env.CONTACT_NOTIFY_TO,
      subject: `[問い合わせ] ${data.subject}`,
      text: [
        `お名前: ${data.name}`,
        `メールアドレス: ${data.email}`,
        `件名: ${data.subject}`,
        "",
        data.message,
      ].join("\n"),
    });

    return { ok: true } as const;
  });
