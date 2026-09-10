import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { button, FormCard, TextField } from "~/components/ui/form";
import { signIn } from "~/lib/auth-client";
import { loginInputSchema } from "~/lib/validation";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginInputSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );

    if (!parsed.success) {
      const flattened = parsed.error.flatten().fieldErrors;
      setErrors({
        username: flattened.username?.[0],
        password: flattened.password?.[0],
      });
      return;
    }

    setErrors({});
    setFormError(null);
    setPending(true);

    const { error } = await signIn.username({
      username: parsed.data.username,
      password: parsed.data.password,
    });

    setPending(false);
    if (error) {
      // 認証失敗の理由は詳細に出さない（アカウント有無の推測を防ぐ）
      setFormError("メールアドレスまたはパスワードが正しくありません。");
      return;
    }

    await navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-screen items-center p-4 sm:p-8">
      <FormCard title="ログイン" description="社内アカウントでログインします。">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            name="username"
            label="アカウント名"
            type="text"
            required
            autoComplete="username"
            invalid={!!errors.username}
            error={errors.username}
          />
          <TextField
            name="password"
            label="パスワード"
            type="password"
            required
            autoComplete="current-password"
            invalid={!!errors.password}
            error={errors.password}
          />
          {formError ? (
            <p className="text-sm text-red-600" role="alert">
              {formError}
            </p>
          ) : null}
          <button type="submit" className={button()} disabled={pending}>
            {pending ? "ログイン中..." : "ログイン"}
          </button>
        </form>
      </FormCard>
    </main>
  );
}
