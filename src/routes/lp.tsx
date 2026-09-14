import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * 架空の店舗「バイクショップイケダ」のランディングページ（LP）。
 *
 * 店舗管理アプリ本体とは役割が違う（来店前のお客様に見せる集客用ページ）ため、
 * AppShell（社内向けナビ）は使わず、このファイル内で完結させている。
 * 配色だけは管理画面と同じダーク＋オレンジのテーマ変数を使い、世界観をそろえている。
 *
 * 掲載している店名・住所・電話番号・料金・お客様の声はすべて架空のダミーで、
 * 実在の店舗や個人とは関係がない。写真素材を持たないため、画像は使わず
 * 図形とタイポグラフィだけで見栄えを作っている。
 */
export const Route = createFileRoute("/lp")({
  head: () => ({
    meta: [
      { title: "バイクショップイケダ｜街の整備工場" },
      {
        name: "description",
        content:
          "バイクショップイケダは、車検・修理・カスタムまで一台まるごとお任せいただける街の整備工場です（架空の店舗です）。",
      },
    ],
  }),
  component: LandingPage,
});

/** 取り扱いメニュー。料金は税込の目安 */
const services = [
  {
    no: "01",
    title: "車検・点検",
    body: "指定工場としての設備で、分解整備から書類手続きまで一括で対応します。代車は無料でご用意。",
    price: "¥29,800〜",
  },
  {
    no: "02",
    title: "一般修理",
    body: "エンジン不調、電装トラブル、転倒後の修復まで。原因を特定してから、お見積もりをお出しします。",
    price: "¥3,300〜",
  },
  {
    no: "03",
    title: "カスタム",
    body: "マフラー・サスペンション・外装の交換から、ワンオフ製作のご相談まで承ります。",
    price: "¥8,800〜",
  },
  {
    no: "04",
    title: "タイヤ・オイル交換",
    body: "在庫のあるサイズなら当日交換が可能です。廃油・廃タイヤの処分もこちらで行います。",
    price: "¥2,200〜",
  },
  {
    no: "05",
    title: "販売・買取",
    body: "国産・輸入車問わず、整備済みの中古車をご用意。乗り換えの際の買取も相談できます。",
    price: "査定無料",
  },
  {
    no: "06",
    title: "レッカー・引き取り",
    body: "動かなくなってしまった車両も、店舗から30km圏内なら引き取りにうかがいます。",
    price: "¥5,500〜",
  },
];

/** ご依頼から納車までの流れ */
const steps = [
  { title: "ご相談", body: "お電話・フォーム・ご来店のいずれでも。症状を伺います。" },
  { title: "点検・見積もり", body: "車両をお預かりし、原因を特定してお見積もりをお出しします。" },
  { title: "整備", body: "ご承諾いただいた内容だけを作業します。追加は必ず事前にご連絡。" },
  { title: "納車", body: "作業内容と交換部品をご説明したうえでお引き渡しします。" },
];

/** お客様の声（架空） */
const voices = [
  {
    text: "見積もりの段階で、交換する部品の理由まで説明してもらえました。金額が後から増えなかったのが何より安心でした。",
    who: "50代・ツーリング中心",
  },
  {
    text: "旧車で断られ続けていたのですが、こちらでは部品を探すところから付き合ってくれました。",
    who: "40代・旧車乗り",
  },
  {
    text: "通勤で毎日使うので、代車を無料で貸してもらえるのが本当に助かっています。",
    who: "30代・通勤利用",
  },
];

function LandingPage() {
  return (
    // 管理画面は明るい配色だが、このページだけは theme-dark で暗い配色に切り替える
    <div className="theme-dark min-h-screen bg-shell text-ink">
      <SiteHeader />
      <main>
        <Hero />
        <Stats />
        <Services />
        <Flow />
        <Voices />
        <Access />
        <ClosingCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-shell/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/lp" className="flex items-center gap-2.5">
          <Logo />
          <span className="leading-tight">
            <span className="block text-sm font-bold tracking-wider">
              バイクショップイケダ
            </span>
            <span className="block text-[10px] tracking-[0.25em] text-ink-faint uppercase">
              Ikeda Motorcycles
            </span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          {[
            { href: "#services", label: "サービス" },
            { href: "#flow", label: "ご依頼の流れ" },
            { href: "#voices", label: "お客様の声" },
            { href: "#access", label: "アクセス" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          to="/contact"
          className="ml-auto inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-strong md:ml-0"
        >
          ご相談はこちら
        </Link>
      </div>
    </header>
  );
}

/** 店のシンボル。画像を使わず、六角ボルトを模した図形で作っている */
function Logo() {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 items-center justify-center bg-accent text-accent-ink"
      style={{
        clipPath:
          "polygon(25% 2%, 75% 2%, 100% 50%, 75% 98%, 25% 98%, 0% 50%)",
      }}
    >
      <span className="text-base font-black">I</span>
    </span>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* 背景。斜めのストライプとオレンジの光で「工場の照明」らしさを出す */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, var(--color-accent) 0 2px, transparent 2px 22px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-3xl"
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1 text-xs font-medium tracking-wide text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            創業1998年 ／ 整備士在籍4名
          </p>

          <h1 className="mt-6 text-4xl leading-[1.15] font-black tracking-tight sm:text-6xl">
            そのバイク、
            <br />
            <span className="text-accent">まだ終わりじゃない。</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
            車検・修理・カスタム・引き取りまで、一台まるごとお任せいただける街の整備工場です。
            直すか買い替えるか迷っている段階から、遠慮なくご相談ください。
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-base font-bold text-accent-ink transition-colors hover:bg-accent-strong"
            >
              無料で見積もりを頼む
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#services"
              className="inline-flex items-center rounded-md border border-line px-6 py-3.5 text-base font-bold text-ink transition-colors hover:border-accent hover:text-accent"
            >
              サービスを見る
            </a>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            {[
              ["見積もり", "無料・追加費用なし"],
              ["代車", "無料で貸し出し"],
              ["対応", "国産・輸入・旧車"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-2">
                <dt className="text-ink-faint">{label}</dt>
                <dd className="font-bold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 受付情報のカード。写真の代わりに情報を置いて右側の重心を作る */}
        <div className="rounded-2xl border border-line bg-surface/80 p-7 shadow-2xl shadow-black/40 backdrop-blur">
          <p className="text-xs font-bold tracking-[0.2em] text-accent uppercase">
            Reservation
          </p>
          <p className="mt-3 text-lg font-bold">まずはお電話ください</p>
          <p className="mt-2 text-4xl font-black tracking-tight tabular-nums">
            03-0000-0000
          </p>
          <p className="mt-1 text-sm text-ink-faint">
            受付 9:00 - 19:00（水曜定休）
          </p>

          <ul className="mt-6 space-y-3 border-t border-line pt-6 text-sm">
            {[
              "症状が分からなくても大丈夫です",
              "その場でおおよその費用をお伝えします",
              "引き取りが必要な場合もご相談ください",
            ].map((text) => (
              <li key={text} className="flex gap-2.5 text-ink-muted">
                <span className="mt-0.5 font-bold text-accent" aria-hidden>
                  ✓
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-b border-line bg-surface/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-line/60 sm:grid-cols-4">
        {[
          ["27", "年", "地元で営業"],
          ["12,000", "台", "累計整備実績"],
          ["4", "名", "国家資格整備士"],
          ["98", "%", "見積もり通りの請求"],
        ].map(([value, unit, label]) => (
          <div key={label} className="bg-shell px-5 py-8 text-center">
            <p className="text-3xl font-black tracking-tight text-accent tabular-nums sm:text-4xl">
              {value}
              <span className="ml-0.5 text-base font-bold text-ink-muted">
                {unit}
              </span>
            </p>
            <p className="mt-1.5 text-xs text-ink-faint sm:text-sm">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Services() {
  return (
    <Section
      id="services"
      eyebrow="Services"
      title="できること"
      lead="点検からカスタムまで、同じ工場のなかで完結します。他店で断られた内容もまずはご相談ください。"
    >
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line/60 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <article
            key={service.no}
            className="group relative bg-surface p-7 transition-colors hover:bg-surface-raised"
          >
            {/* 左端のオレンジの帯。ホバーで伸びる */}
            <span
              aria-hidden
              className="absolute top-7 bottom-7 left-0 w-0.5 bg-accent opacity-0 transition-opacity group-hover:opacity-100"
            />
            <p className="text-xs font-black tracking-[0.2em] text-ink-faint">
              {service.no}
            </p>
            <h3 className="mt-3 text-xl font-bold">{service.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
              {service.body}
            </p>
            <p className="mt-5 text-sm font-bold text-accent tabular-nums">
              {service.price}
            </p>
          </article>
        ))}
      </div>
      <p className="mt-4 text-xs text-ink-faint">
        ※ 記載の金額は税込の目安です。車種・状態により変わりますので、正確な金額はお見積もりでご確認ください。
      </p>
    </Section>
  );
}

function Flow() {
  return (
    <Section
      id="flow"
      eyebrow="Flow"
      title="ご依頼の流れ"
      lead="お預かりしてから納車まで、金額とやることを毎回確認しながら進めます。"
    >
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="relative rounded-xl border border-line bg-surface p-6"
          >
            <span className="absolute -top-3 left-6 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-black text-accent-ink tabular-nums">
              {index + 1}
            </span>
            <h3 className="mt-2 text-lg font-bold">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Voices() {
  return (
    <Section
      id="voices"
      eyebrow="Voices"
      title="お客様の声"
      lead="ご来店いただいた方からいただいた感想です（掲載はすべて架空のサンプルです）。"
    >
      <div className="grid gap-5 md:grid-cols-3">
        {voices.map((voice) => (
          <figure
            key={voice.who}
            className="flex h-full flex-col rounded-xl border border-line bg-surface p-6"
          >
            <span aria-hidden className="text-3xl leading-none text-accent/60">
              &ldquo;
            </span>
            <blockquote className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
              {voice.text}
            </blockquote>
            <figcaption className="mt-5 border-t border-line pt-4 text-xs text-ink-faint">
              {voice.who}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}

function Access() {
  const rows = [
    ["店名", "バイクショップイケダ"],
    ["所在地", "東京都豊島区西巣鴨1-1（架空の住所です）"],
    ["電話", "03-0000-0000"],
    ["営業時間", "9:00 - 19:00"],
    ["定休日", "毎週水曜日・第2木曜日"],
    ["駐車場", "店舗前に3台（バイクは10台まで）"],
  ];

  return (
    <Section
      id="access"
      eyebrow="Access"
      title="店舗情報"
      lead="都営三田線 西巣鴨駅から徒歩5分。国道沿いのオレンジの看板が目印です。"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <dl className="overflow-hidden rounded-xl border border-line bg-surface">
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={`grid grid-cols-[7rem_1fr] gap-4 px-6 py-4 text-sm ${
                index === 0 ? "" : "border-t border-line"
              }`}
            >
              <dt className="text-ink-faint">{label}</dt>
              <dd className="font-medium break-words">{value}</dd>
            </div>
          ))}
        </dl>

        {/* 地図は用意できないため、簡易的な案内図を図形で表現している */}
        <div className="relative flex min-h-[15rem] items-center justify-center overflow-hidden rounded-xl border border-line bg-surface">
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div
            aria-hidden
            className="absolute top-1/2 -left-10 h-10 w-[130%] -translate-y-1/2 -rotate-6 bg-surface-raised"
          />
          <div className="relative text-center">
            <Logo />
            <p className="mt-3 text-sm font-bold">バイクショップイケダ</p>
            <p className="mt-1 text-xs text-ink-faint">
              西巣鴨駅から国道沿いに徒歩5分
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

function ClosingCta() {
  return (
    <section className="relative overflow-hidden border-t border-line">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, var(--color-accent) 0 2px, transparent 2px 22px)",
        }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
          迷っている時間も、
          <span className="text-accent">整備の時間</span>にしませんか。
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          見積もりは無料です。直すべきか、乗り換えるべきか。判断に必要な材料をそろえてお渡しします。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-md bg-accent px-7 py-3.5 text-base font-bold text-accent-ink transition-colors hover:bg-accent-strong"
          >
            お問い合わせフォームへ
            <span aria-hidden>→</span>
          </Link>
          <a
            href="tel:0300000000"
            className="inline-flex items-center rounded-md border border-line px-7 py-3.5 text-base font-bold transition-colors hover:border-accent hover:text-accent"
          >
            03-0000-0000 に電話する
          </a>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-xs text-ink-faint sm:px-6">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span>© バイクショップイケダ（架空の店舗です）</span>
        </div>
        {/* 従業員向けの入口。お客様向けの導線と混ざらないよう、控えめに置いている */}
        <Link
          to="/login"
          className="ml-auto transition-colors hover:text-accent"
        >
          スタッフの方はこちら
        </Link>
      </div>
    </footer>
  );
}

/** 各セクションの共通枠（見出しの体裁をそろえるため） */
function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-16 border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-black tracking-[0.3em] text-accent uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
          {lead}
        </p>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
