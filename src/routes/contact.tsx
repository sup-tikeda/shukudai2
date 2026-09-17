import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SelectField, TextField } from "~/components/ui/form";
import { inquiryInputSchema, inquiryTopicValues } from "~/lib/validation";
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
    // 店舗紹介ページから続けて見る画面なので、配色・書体をそちらに合わせる
    <div className="theme-lp min-h-screen bg-shell font-lp text-ink">
      <main className="mx-auto max-w-[840px] px-5 py-[52px] min-[760px]:px-7">
        <Link
          to="/lp"
          className="inline-flex items-center gap-2.5 text-[13px] tracking-[0.04em] text-ink-muted transition-colors duration-[220ms] ease-out hover:text-ink"
        >
          <span aria-hidden>←</span>
          バイクショップイケダ
        </Link>

        <h1 className="mt-12 text-[34px] leading-[1.08] font-normal tracking-[-0.035em] min-[760px]:text-[48px] min-[760px]:leading-[1.06]">
          お問い合わせ
        </h1>
        <p className="mt-9 max-w-[560px] text-[17px] leading-[1.5] text-ink-muted">
          内容を確認のうえ、担当者よりご連絡します。
          症状が分からなくても構いません。分かる範囲でお書きください。
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-12 flex max-w-[560px] flex-col gap-7 border-t border-line pt-12"
        >
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
          <SelectField
            name="subject"
            label="ご相談内容"
            placeholder="選択してください"
            options={inquiryTopicValues.map((topic) => ({
              value: topic,
              label: topic,
            }))}
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
            <p className="text-sm text-success">送信しました。</p>
          ) : null}
          {status === "error" ? (
            <p className="text-sm text-danger">
              送信に失敗しました。時間をおいて再度お試しください。
            </p>
          ) : null}

          {/* 個人情報を預かる場所なので、送信の直前に取り扱いの説明へ導く */}
          <p className="text-xs leading-[1.6] text-ink-faint">
            送信することで、
            <Link to="/privacy" className="underline hover:text-ink">
              プライバシーポリシー
            </Link>
            に同意したものとみなします。
          </p>

          {/* 見た目は店舗紹介ページのボタンに合わせる（高さ58pxの丸ボタン） */}
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex h-[58px] w-full items-center justify-center rounded-full bg-accent px-6 min-[400px]:px-11 text-[17px] leading-none font-normal tracking-[0.12em] whitespace-nowrap text-accent-ink transition-colors duration-[220ms] ease-out hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40 min-[760px]:w-auto min-[760px]:min-w-[310px] min-[760px]:self-start min-[760px]:text-[20px]"
          >
            {status === "sending" ? "送信中..." : "送信する"}
          </button>
        </form>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[840px] flex-wrap items-center gap-4 px-5 py-6 text-xs text-ink-faint min-[760px]:px-7">
          <span>© バイクショップイケダ（架空の店舗です）</span>
          <Link
            to="/lp"
            className="ml-auto transition-colors duration-[220ms] ease-out hover:text-ink"
          >
            トップへ戻る
          </Link>
        </div>
      </footer>
    </div>
  );
}
