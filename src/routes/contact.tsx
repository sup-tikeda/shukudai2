import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { button, FormCard, TextField } from "~/components/ui/form";
import { inquiryInputSchema } from "~/lib/validation";
import { submitInquiry } from "~/server/inquiries";

export const Route = createFileRoute("/contact")({
  component: ContactPage,
});

type FieldErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

function ContactPage() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = inquiryInputSchema.safeParse(
      Object.fromEntries(new FormData(form)),
    );

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors({
        name: flattened.name?.[0],
        email: flattened.email?.[0],
        subject: flattened.subject?.[0],
        message: flattened.message?.[0],
      });
      return;
    }

    setErrors({});
    setStatus("sending");
    try {
      await submitInquiry({ data: parsed.data });
      form.reset();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="min-h-screen p-8">
      <FormCard
        title="お問い合わせ"
        description="内容を確認のうえ、担当者よりご連絡します。"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="name"
            label="お名前"
            required
            invalid={!!errors.name}
            error={errors.name}
          />
          <TextField
            name="email"
            label="メールアドレス"
            type="email"
            required
            invalid={!!errors.email}
            error={errors.email}
          />
          <TextField
            name="subject"
            label="件名"
            required
            invalid={!!errors.subject}
            error={errors.subject}
          />
          <TextField
            name="message"
            label="お問い合わせ内容"
            multiline
            required
            invalid={!!errors.message}
            error={errors.message}
          />

          {status === "done" ? (
            <p className="text-sm text-green-700">送信しました。</p>
          ) : null}
          {status === "error" ? (
            <p className="text-sm text-red-600">
              送信に失敗しました。時間をおいて再度お試しください。
            </p>
          ) : null}

          <button
            type="submit"
            className={button()}
            disabled={status === "sending"}
          >
            {status === "sending" ? "送信中..." : "送信する"}
          </button>
        </form>
      </FormCard>
    </main>
  );
}
