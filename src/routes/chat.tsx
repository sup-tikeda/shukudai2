import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { button } from "~/components/ui/form";
import { AppShell, Card, PageHeader } from "~/components/ui/layout";
import { askCompanyChat } from "~/server/chat";
import { chatQuestionInputSchema } from "~/lib/validation";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
});

type ChatEntry = {
  question: string;
  answer: string;
  usedDocuments: { id: string; title: string }[];
};

/**
 * 社内チャット。勤務時間・有給休暇日数など、社内規定をすぐ調べるためのもの。
 * 登録された社内規定の文書だけを根拠にAIが答える（設定画面「社内規定」で管理）。
 * 会話履歴は保存せず、この画面を開いている間だけ保持する。
 *
 * やり取りの一覧（増え続ける）と、質問フォーム（常に押せる状態を保ちたい）を
 * 別カードに分け、一覧側だけを `fill` にしてスクロールさせる。1つのカードに
 * まとめると、やり取りが増えるほど送信ボタンがページの下へ押し流されてしまうため。
 */
function ChatPage() {
  const formRef = useRef<HTMLFormElement>(null);
  // 一覧の末尾に置く目印。ここへスクロールさせることで、
  // 実際にどの要素がスクロールしているか（Cardの内部実装）を気にせず済む。
  const bottomRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AIチャットのように、回答が増えるたびに一覧の最後尾まで自動でスクロールする
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history.length]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = chatQuestionInputSchema.safeParse(formData);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "質問を入力してください。");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const result = await askCompanyChat({ data: parsed.data });
      setHistory((prev) => [
        ...prev,
        {
          question: parsed.data.question,
          answer: result.answer,
          usedDocuments: result.usedDocuments,
        },
      ]);
      formRef.current?.reset();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "回答の取得に失敗しました。時間をおいて再度お試しください。",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell fill>
      <PageHeader
        eyebrow="Chat"
        title="社内チャット"
        subtitle="勤務時間・有給休暇日数など、社内規定に関する質問に答えます（設定画面「社内規定」に登録された文書だけを根拠にします）。"
      />

      <Card
        fill
        title="やり取り"
        count={`${history.length} 件`}
        actions={
          history.length > 0 ? (
            <button
              type="button"
              className={button({ variant: "ghost", size: "sm" })}
              onClick={() => setHistory([])}
            >
              リセット
            </button>
          ) : null
        }
      >
        <div className="flex flex-col gap-4 p-4">
          {history.length === 0 ? (
            <p className="text-sm text-ink-faint">
              まだ質問はありません。「有給休暇は何日ありますか？」のように聞いてみてください。
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {history.map((entry, i) => (
                <li key={i} className="rounded-md border border-line p-3">
                  <p className="text-sm font-bold text-ink">{entry.question}</p>
                  <p className="mt-2 text-sm whitespace-pre-wrap text-ink-muted">
                    {entry.answer}
                  </p>
                  {entry.usedDocuments.length > 0 ? (
                    <p className="mt-2 text-xs text-ink-faint">
                      参照した社内規定：
                      {entry.usedDocuments.map((doc) => doc.title).join("、")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div ref={bottomRef} />
        </div>
      </Card>

      <div className="mt-3 shrink-0 rounded-xl border border-line bg-surface p-3 shadow-sm shadow-ink/5">
        <form ref={formRef} onSubmit={handleSubmit} className="flex gap-3">
          <input
            name="question"
            type="text"
            placeholder="質問を入力（例：有給休暇は何日ありますか？）"
            className="w-full min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          <button
            type="submit"
            className={button({ className: "shrink-0" })}
            disabled={pending}
          >
            {pending ? "問い合わせ中..." : "質問する"}
          </button>
        </form>
        {error ? (
          <p className="mt-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
