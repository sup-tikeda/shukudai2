import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * プライバシーポリシー。お問い合わせフォームで個人情報を預かるため、
 * その取り扱いを示す先として店舗紹介ページ（LP）のフッターから開く。
 *
 * 配色と書体は LP と同じ theme-lp／font-lp を使い、来店前のお客様から見て
 * 同じサイトに見えるようにしている。
 *
 * 記載は架空の店舗の見本であり、実際の運用に使う場合は事業者の実態に合わせた
 * 確認が必要（本文の注記でもその旨を明示している）。
 */
export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "プライバシーポリシー｜バイクショップイケダ" },
      {
        name: "description",
        content:
          "バイクショップイケダ（架空の店舗）における個人情報の取り扱いについて。",
      },
    ],
  }),
  component: PrivacyPage,
});

/** 本文の各節。実装（src/server/inquiries.ts）の挙動に合わせて書いている */
const sections = [
  {
    title: "取得する情報",
    body: [
      "お問い合わせフォームをご利用いただく際に、お名前、メールアドレス、件名、お問い合わせ内容を入力していただきます。",
      "これ以外の情報を、お客様に入力していただくことはありません。",
    ],
  },
  {
    title: "利用目的",
    body: [
      "お預かりした情報は、お問い合わせへの回答および、そのために必要なご連絡にのみ使用します。",
      "広告や案内の送付には使用しません。",
    ],
  },
  {
    title: "保存について",
    body: [
      "お問い合わせの内容は、当サイトでは保存していません。送信された内容は、店舗の担当者宛にメールとして転送されるのみです。",
      "転送後のメールは、お問い合わせへの対応が終わったのち、店舗の判断で削除します。",
    ],
  },
  {
    title: "第三者への提供",
    body: [
      "法令に基づく場合を除き、お預かりした情報を第三者に提供することはありません。",
    ],
  },
  {
    title: "開示・訂正・削除のご請求",
    body: [
      "お客様ご自身の情報について、開示・訂正・削除をご希望の場合は、下記の連絡先までお申し出ください。ご本人であることを確認のうえ、速やかに対応します。",
    ],
  },
  {
    title: "お問い合わせ先",
    body: [
      "バイクショップイケダ（架空の店舗です）",
      "東京都豊島区西巣鴨1-1（架空の住所です）／ 03-0000-0000 ／ hello@example.com",
    ],
  },
  {
    title: "本ポリシーの改定",
    body: [
      "内容を変更する場合は、このページに改定後の内容を掲載します。",
    ],
  },
];

function PrivacyPage() {
  return (
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
          プライバシーポリシー
        </h1>

        {/* 見本である旨は最初に伝える。実在の店舗の方針と誤解されないようにするため */}
        <p className="mt-9 border border-line-strong px-6 py-5 text-[15px] leading-[1.6] text-ink-muted">
          このページは、架空の店舗「バイクショップイケダ」の見本として作成したものです。
          実際の事業でご利用になる場合は、取り扱いの実態に合わせて内容をご確認ください。
        </p>

        <div className="mt-12 border-t border-line">
          {sections.map((section) => (
            <section key={section.title} className="border-b border-line py-9">
              <h2 className="text-[22px] leading-[1.2] font-bold">
                {section.title}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mt-4 text-[15px] leading-[1.7] text-ink-muted"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <p className="mt-9 text-xs text-ink-faint">制定日：2026年9月16日</p>
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
