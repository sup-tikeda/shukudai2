import { createFileRoute, Link } from "@tanstack/react-router";

/**
 * 架空の店舗「バイクショップイケダ」のランディングページ（LP）。
 *
 * 店舗管理アプリ本体とは役割が違う（来店前のお客様に見せる集客用ページ）ため、
 * AppShell（社内向けナビ）は使わず、このファイル内で完結させている。
 *
 * 見た目は design-spec.yml（雑誌的な全面写真＋細い書体の版面）に合わせている。
 * spec は home / pricing / services の3ページ構成だが、このページは1枚に統合し、
 * 各ページのセクションを縦に並べている。
 *
 * 掲載している店名・住所・電話番号・料金・お客様の声はすべて架空のダミーで、
 * 実在の店舗や個人とは関係がない。写真はまだ用意できていないため、spec が写真を置く位置には
 * CSSで作った代替の面を同じ大きさで置いている（差し替え方は後述の PHOTOS を参照）。
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

/** 創業年（架空の設定）。実績の表記と営業年数の両方がこれを見る */
const FOUNDED_YEAR = 1998;

/**
 * design-spec.yml の typography をクラス文字列にしたもの。
 * spec は見出しも weight 400 と細く、字間を詰めることで大きさを出している。
 * 760px 未満はモバイル指定のサイズに落とす。
 */
const TYPE = {
  display:
    "text-[48px] leading-[1.0] font-normal tracking-[-0.04em] min-[760px]:text-[78px] min-[760px]:leading-[0.98] min-[760px]:tracking-[-0.045em]",
  h1: "text-[40px] leading-[1.04] font-normal tracking-[-0.035em] min-[760px]:text-[50px] min-[760px]:leading-[1.02]",
  h2: "text-[34px] leading-[1.08] font-normal tracking-[-0.035em] min-[760px]:text-[48px] min-[760px]:leading-[1.06]",
  h3: "text-[22px] leading-[1.2] font-bold",
  body: "text-[17px] leading-[1.3] font-normal min-[760px]:text-[20px] min-[760px]:leading-[1.22]",
};

/** 枠線だけの丸ボタン（spec の outline_cta）。Link と a の両方に付けるためクラスで持つ */
/*
 * spec の width は 310px だが、日本語の label は字幅が広く折り返してしまう。
 * 310px は最小幅として使い、文字数に応じて横に伸ばす。
 */
const OUTLINE_CTA =
  "inline-flex h-[58px] max-w-full items-center justify-center rounded-full border border-line-strong bg-transparent px-6 min-[400px]:min-w-[310px] min-[400px]:px-11 text-[17px] leading-none font-normal tracking-[0.12em] whitespace-nowrap transition-colors duration-[220ms] ease-out hover:bg-accent hover:text-accent-ink min-[760px]:text-[20px]";

/** 左右2分割の版面（spec の split_media）。760px 未満では縦積みになり、文章が先に来る */
const SPLIT_MEDIA =
  "mx-auto grid w-full max-w-[1440px] min-[760px]:min-h-[684px] min-[760px]:grid-cols-[41.5%_58.5%]";

/** ページ左右の余白（spec の page_gutter: モバイル20px / それ以上28px） */
const GUTTER = "px-5 min-[760px]:px-7";

/**
 * 写真の差し替え表。ここだけを書き換えれば全ての枠が入れ替わる。
 *
 * 画像ファイルは public/lp/ に置き、src にはそこからのURL（例 "/lp/hero.jpg"）を書く。
 * src が空のあいだは、代わりに CSS で作った面（MediaSlot）を同じ大きさで表示する。
 *
 * position は design-spec.yml の treatment.position に対応する。写真は object-fit: cover で
 * 切り抜かれるため、残したい部分（被写体の顔や車体）が切れる場合にここをずらす。
 */
const PHOTOS = {
  hero: {
    src: "/lp/hero.jpg",
    alt: "工場の床に立つ整備士の足元と工具カート",
    position: "center 58%",
  },
  about: {
    src: "/lp/about.jpg",
    alt: "工具棚の前で工具を手に取る整備士",
    position: "center",
  },
  reasonEstimate: {
    src: "/lp/reason-estimate.jpg",
    alt: "壁一面の工具棚から工具を選ぶ整備士",
    position: "center",
  },
  reasonSpeed: {
    src: "/lp/reason-speed.jpg",
    alt: "ホイールを外して作業する整備士",
    position: "center",
  },
  reasonRange: {
    src: "/lp/reason-range.jpg",
    alt: "作業台で溶接する整備士",
    position: "center",
  },
  shop: {
    src: "/lp/shop.jpg",
    alt: "工具箱の前でスパナを受け渡す整備士",
    position: "center",
  },
};

type Photo = { src: string; alt: string; position: string };

/**
 * 取り扱いメニュー。料金はすべて税込の目安。
 *
 * 金額は作業マスタ（src/db/seed.ts の work_items）の単価を税込に直した値で、
 * 対応する管理番号をコメントに添えている。マスタ側を変えたらここも直すこと。
 * 金額のつかない「査定無料」は、数字のある項目のあとに置いている。
 */
const services = [
  {
    title: "車検・点検",
    price: "¥22,000〜", // 102 車検基本料 20,000（税抜）
    includes: "分解整備・書類手続き・代車（無料）",
    body: "指定工場としての設備で、分解整備から書類手続きまで一括で対応します。",
  },
  {
    title: "一般修理",
    price: "¥2,200〜", // 101 点検基本料 2,000（税抜）
    includes: "点検・原因の特定・見積もり",
    body: "エンジン不調、電装トラブル、転倒後の修復まで承ります。",
  },
  {
    title: "カスタム",
    price: "¥8,800〜", // 106 取付工賃 8,000（税抜）
    includes: "部品選定・取り付け・調整",
    body: "マフラー・サスペンション・外装の交換から、ワンオフ製作のご相談まで。",
  },
  {
    title: "タイヤ・オイル交換",
    price: "¥2,200〜", // 104 タイヤ交換工賃 2,000（税抜）
    includes: "交換作業・廃油／廃タイヤ処分",
    body: "在庫のあるサイズなら当日交換が可能です。",
  },
  {
    title: "レッカー・引き取り",
    price: "¥5,500〜", // 108 引き取り・レッカー料 5,000（税抜）
    includes: "30km圏内の引き取り",
    body: "動かなくなってしまった車両も、ご自宅までうかがいます。",
  },
  {
    title: "販売・買取",
    price: "査定無料", // 901 車両査定 0円
    includes: "車両査定・名義変更手続き",
    body: "国産・輸入車問わず、整備済みの中古車をご用意しています。",
  },
];

/** 他店との違い（spec の differentiators に対応する3枚） */
const differentiators = [
  {
    title: "見積もりがそのまま請求になる",
    body: "点検で原因を特定してから金額をお出しします。ご承諾いただいた作業以外は行わず、追加が必要なときは必ず事前にご連絡します。",
    photo: PHOTOS.reasonEstimate,
  },
  {
    title: "待たせない、止めない",
    body: "在庫のあるタイヤ・オイルは当日交換。お預かりが長くなる場合は、代車を無料でお貸しします。",
    photo: PHOTOS.reasonSpeed,
  },
  {
    title: "他店で断られた一台こそ",
    body: "国産・輸入・旧車まで対応します。部品が出ない車両も、探すところからお付き合いします。",
    photo: PHOTOS.reasonRange,
  },
];

/** ご依頼から納車までの流れ */
const steps = [
  {
    title: "ご相談",
    body: "お電話・フォーム・ご来店のいずれでも。症状を伺います。",
  },
  {
    title: "点検・見積もり",
    body: "車両をお預かりし、原因を特定してお見積もりをお出しします。",
  },
  {
    title: "整備",
    body: "ご承諾いただいた内容だけを作業します。追加は必ず事前にご連絡。",
  },
  {
    title: "納車",
    body: "作業内容と交換部品をご説明したうえでお引き渡しします。",
  },
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

/** 店舗情報（架空） */
const shopInfo = [
  ["店名", "バイクショップイケダ"],
  ["所在地", "東京都豊島区西巣鴨1-1（架空の住所です）"],
  ["電話", "03-0000-0000"],
  ["営業時間", "9:00 - 19:00"],
  ["定休日", "毎週水曜日・第2木曜日"],
  ["駐車場", "店舗前に3台（バイクは10台まで）"],
];

const NAV = [
  { href: "#about", label: "私たちについて" },
  { href: "#services", label: "サービスと料金" },
  { href: "#flow", label: "ご依頼の流れ" },
  { href: "#access", label: "店舗情報" },
];

function LandingPage() {
  return (
    // 管理画面は明るい配色だが、このページだけは theme-lp で spec の配色に切り替える
    <div className="theme-lp min-h-screen overflow-x-hidden bg-shell font-lp text-ink">
      <main>
        <Hero />
        <Record />
        <About />
        <Differentiators />
        <Services />
        <Flow />
        <Voices />
        <Access />
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * 写真の枠。PHOTOS に src があればその画像を、無ければ CSS で作った代替の面を出す。
 * どちらの場合も同じ位置・同じ大きさを占めるので、写真を用意しても版面は変わらない。
 *
 * eager は最初の画面に写る写真（ヒーロー）に付ける。ここを遅延読み込みにすると
 * 表示が一拍遅れて、ページが重く見えてしまうため。
 */
function MediaSlot({
  photo,
  eager = false,
  className = "",
}: {
  photo: Photo;
  eager?: boolean;
  className?: string;
}) {
  if (photo.src) {
    return (
      <img
        src={photo.src}
        alt={photo.alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ objectPosition: photo.position }}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={`写真（準備中）：${photo.alt}`}
      className={`relative isolate h-full w-full overflow-hidden bg-[#0f1413] ${className}`}
    >
      {/* 夕方の斜光を想定した暖色の明かりと、沈んだ影 */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 95% at 76% 16%, rgba(214,148,74,0.48) 0%, rgba(52,37,0,0.6) 38%, rgba(15,20,19,0.96) 78%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 75% at 10% 94%, rgba(23,63,56,0.9) 0%, transparent 62%)",
        }}
      />
      {/* 斜めの細いストライプ。のっぺりした面に粒立ちを与える */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.13]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #f7f5f0 0 1px, transparent 1px 15px)",
        }}
      />
      <p
        className={`absolute right-0 bottom-0 left-0 py-4 text-[11px] leading-[1.4] tracking-[0.16em] text-ink/40 ${GUTTER}`}
      >
        {photo.alt}
      </p>
    </div>
  );
}

/** 店のシンボル。spec の「3本の短いストローク＋2行のロゴタイプ」に倣っている */
function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="flex flex-col gap-[3px]">
        <span className="block h-[2px] w-6 bg-current" />
        <span className="block h-[2px] w-4 bg-current" />
        <span className="block h-[2px] w-5 bg-current" />
      </span>
      <span className="text-[11px] leading-[1.3] font-bold tracking-[0.18em]">
        IKEDA
        <br />
        MOTORCYCLES
      </span>
    </span>
  );
}

/**
 * ヒーロー。spec の full_bleed_hero に合わせ、全面の写真の上に
 * ロゴ（左上）・見出し・本文（左下）・ボタン（右下）を置いている。
 * ナビはヘッダーとして固定せず、写真の上に重ねて版面を邪魔しないようにした。
 */
function Hero() {
  return (
    <section className="relative isolate min-h-[620px] overflow-hidden min-[760px]:min-h-[682px]">
      <div className="absolute inset-0">
        <MediaSlot photo={PHOTOS.hero} eager />
      </div>
      <div
        aria-hidden
        className="absolute inset-0 bg-[rgba(3,20,23,0.10)]"
      />

      <div
        className={`relative flex min-h-[620px] flex-col py-5 min-[760px]:min-h-[682px] min-[760px]:py-7 ${GUTTER}`}
      >
        <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center gap-x-6 gap-y-4">
          <Logo className="w-24" />
          <nav className="ml-auto hidden items-center gap-6 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm tracking-[0.08em] text-ink-muted transition-colors duration-[220ms] ease-out hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mx-auto mt-14 w-full max-w-[1440px]">
          <h1 className={`max-w-[700px] ${TYPE.display}`}>
            そのバイク、
            <br />
            まだ終わりじゃない。
          </h1>
        </div>

        <div className="mx-auto mt-12 flex w-full max-w-[1440px] flex-col gap-7 min-[760px]:mt-auto min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between">
          <p className={`max-w-[590px] text-ink-muted ${TYPE.body}`}>
            車検・修理・カスタム・引き取りまで、一台まるごとお任せいただける街の整備工場です。
            直すか買い替えるか迷っている段階から、遠慮なくご相談ください。
          </p>
          <Link
            to="/contact"
            className={`${OUTLINE_CTA} w-full shrink-0 min-[760px]:w-auto`}
          >
            見積もりを依頼する
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * 実績の帯。spec には対応するコンポーネントが無いが、
 * 写真の面が続くなかで数字だけの区画を挟むと読みやすくなるため残している。
 */
function Record() {
  // 営業年数は創業年から計算する。固定の数字を書くと、年が明けるたびに
  // 「創業1998年」の表記と食い違ってしまうため。
  const years = new Date().getFullYear() - FOUNDED_YEAR;

  return (
    <section className="bg-surface">
      <div
        className={`mx-auto grid max-w-[1440px] grid-cols-2 gap-x-7 gap-y-9 py-[52px] min-[760px]:grid-cols-4 ${GUTTER}`}
      >
        {[
          [String(years), "年", "地元で営業"],
          ["12,000", "台", "累計整備実績"],
          ["4", "名", "国家資格整備士"],
          ["98", "%", "見積もり通りの請求"],
        ].map(([value, unit, label]) => (
          <div key={label}>
            <p className={`tabular-nums ${TYPE.h2}`}>
              {value}
              <span className="ml-1 text-base tracking-normal text-ink-muted">
                {unit}
              </span>
            </p>
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-muted">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 店の紹介（spec の expertise: split_media） */
function About() {
  return (
    <section id="about" className="bg-shell">
      <div className={SPLIT_MEDIA}>
        {/* カンプでは見出しが段の左端、本文だけが一段下げて組まれている */}
        <div className={`flex flex-col py-[52px] ${GUTTER}`}>
          <h2 className={TYPE.h2}>{FOUNDED_YEAR}年から、この街で。</h2>
          <div className="mt-9 flex flex-col gap-7 min-[760px]:ps-20">
            <p className={`text-ink-muted ${TYPE.body}`}>
              家族で営む小さな整備工場です。大きな看板も新しい設備も持っていませんが、
              一台ずつ手をかける時間だけは削らずにやってきました。
            </p>
            <p className={`text-ink-muted ${TYPE.body}`}>
              いい整備は、正直なやりとりから始まると思っています。だから見積もりは無料で、
              金額の内訳も、交換する部品の理由も、作業の前に必ずご説明します。
            </p>
          </div>
        </div>
        <MediaSlot
          photo={PHOTOS.about}
          className="min-h-[420px] min-[760px]:min-h-full"
        />
      </div>
    </section>
  );
}

/** 他店との違い（spec の differentiators: card_grid） */
function Differentiators() {
  return (
    <section className="bg-surface">
      <div
        className={`mx-auto max-w-[1440px] py-[52px] ${GUTTER}`}
      >
        <h2 className={`max-w-[700px] ${TYPE.h2}`}>選ばれている理由</h2>
        <div className="mt-12 grid gap-7 min-[760px]:grid-cols-3">
          {differentiators.map((card) => (
            <article key={card.title} className="flex flex-col">
              <MediaSlot photo={card.photo} className="h-[300px]" />
              {/* カンプではカード本文は中央揃え */}
              <div className="flex flex-1 flex-col bg-surface-raised p-7 text-center">
                <h3 className={TYPE.h3}>{card.title}</h3>
                <p className="mt-4 text-[15px] leading-[1.5] text-ink-muted">
                  {card.body}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/** サービスと料金（spec の standard_pricing: data_table） */
function Services() {
  return (
    <section id="services" className="bg-shell">
      <div className={`mx-auto max-w-[1440px] py-[52px] ${GUTTER}`}>
        {/* カンプでは注記が見出しと同じ行の右端に置かれている */}
        <div className="flex flex-col gap-4 min-[760px]:flex-row min-[760px]:items-start min-[760px]:justify-between">
          <h2 className={`max-w-[700px] ${TYPE.h2}`}>サービスと料金</h2>
          <p className="max-w-[260px] text-sm leading-[1.5] text-ink-muted min-[760px]:text-right">
            金額は税込の目安です。車種・状態により変わります。
          </p>
        </div>

        {/* 640px 未満では表を横スクロールさせる（列を潰すと料金が読めなくなるため） */}
        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-center">
            <thead className="bg-surface">
              <tr>
                {["サービス", "料金の目安", "含まれるもの"].map((column) => (
                  <th key={column} scope="col" className="px-6 py-5 font-bold">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {services.map((service) => (
                <tr key={service.title} className="border-b border-line">
                  <td className="px-6 py-6">
                    <p className="text-lg">{service.title}</p>
                    <p className="mt-2 text-sm leading-[1.5] text-ink-muted">
                      {service.body}
                    </p>
                  </td>
                  <td className="px-6 py-6 text-lg whitespace-nowrap tabular-nums">
                    {service.price}
                  </td>
                  <td className="px-6 py-6 text-sm leading-[1.5] text-ink-muted">
                    {service.includes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** ご依頼の流れ（spec の core_services: paired_rows） */
function Flow() {
  return (
    <section id="flow" className="bg-shell">
      <div className={`mx-auto max-w-[1440px] py-[52px] ${GUTTER}`}>
        <h2 className={`max-w-[700px] ${TYPE.h2}`}>ご依頼の流れ</h2>
        <ol className="mt-12 flex flex-col gap-2.5 min-[760px]:gap-6">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="grid gap-2.5 min-[760px]:grid-cols-[32%_1fr] min-[760px]:gap-[2%]"
            >
              {/* カンプでは左右どちらの箱も文字が中央に組まれている */}
              <div className="flex items-center justify-center gap-4 rounded-3xl bg-surface px-7 py-6">
                <span className="text-sm text-ink-faint tabular-nums">
                  0{index + 1}
                </span>
                <span className="text-lg font-bold">{step.title}</span>
              </div>
              <div className="flex items-center justify-center rounded-3xl border border-line-strong px-7 py-6">
                <p className={`text-center text-ink-muted ${TYPE.body}`}>
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** お客様の声。card_grid と同じ「角を落とさない面」で揃えている */
function Voices() {
  return (
    <section id="voices" className="bg-shell">
      <div className={`mx-auto max-w-[1440px] py-[52px] ${GUTTER}`}>
        <h2 className={`max-w-[700px] ${TYPE.h2}`}>お客様の声</h2>
        <p className="mt-7 max-w-[780px] text-sm text-ink-faint">
          ご来店いただいた方からいただいた感想です（掲載はすべて架空のサンプルです）。
        </p>
        <div className="mt-12 grid gap-7 min-[760px]:grid-cols-3">
          {voices.map((voice) => (
            <figure
              key={voice.who}
              className="flex h-full flex-col bg-surface-raised p-7"
            >
              <blockquote className="flex-1 text-[17px] leading-[1.45]">
                {voice.text}
              </blockquote>
              <figcaption className="mt-7 border-t border-line pt-5 text-sm text-ink-faint">
                {voice.who}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** 店舗情報（spec の promise: 茶の地に split_media） */
function Access() {
  return (
    <section id="access" className="bg-surface-raised">
      <div className="mx-auto grid w-full max-w-[1440px] min-[760px]:min-h-[684px] min-[760px]:grid-cols-[50.8%_49.2%]">
        {/* About と同じ組み方（見出しは段の左端、中身は一段下げる） */}
        <div className={`flex flex-col py-[52px] ${GUTTER}`}>
          <h2 className={TYPE.h2}>店舗情報</h2>
          <div className="mt-9 min-[760px]:ps-20">
            <p className={`text-ink-muted ${TYPE.body}`}>
              都営三田線 西巣鴨駅から徒歩5分。国道沿いの、白い看板が目印です。
            </p>
            <dl className="mt-7 border-t border-line">
              {shopInfo.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[6.5rem_1fr] gap-4 border-b border-line py-4 text-[15px]"
                >
                  <dt className="text-ink-faint">{label}</dt>
                  <dd className="break-words">{value}</dd>
                </div>
              ))}
            </dl>

            {/* ページ末の行き先はここひとつ。締めの節を別に設けると写真も文言も重なるため */}
            <p className={`mt-9 text-ink-muted ${TYPE.body}`}>
              直すか、乗り換えるか。迷っている段階からご相談ください。
            </p>
            <Link
              to="/contact"
              className={`${OUTLINE_CTA} mt-7 w-full min-[760px]:w-auto`}
            >
              お問い合わせフォームへ
            </Link>
          </div>
        </div>
        <MediaSlot
          photo={PHOTOS.shop}
          className="min-h-[420px] min-[760px]:min-h-full"
        />
      </div>
    </section>
  );
}

/**
 * サイト共通のフッター（spec の site_footer）。
 *
 * 住所・営業時間・電話は直前の店舗情報の節に載っているため、ここでは繰り返さない。
 * 代わりに、サイト全体にかかる情報（著作権表示・個人情報の取り扱い）を置いている。
 */
function SiteFooter() {
  return (
    <footer className="border-t border-line bg-shell">
      <div
        className={`mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-7 gap-y-4 py-7 ${GUTTER}`}
      >
        <Logo />
        <span className="text-xs text-ink-faint">
          © バイクショップイケダ（架空の店舗です）
        </span>
        <div className="ml-auto flex items-center gap-4 text-[13px] tracking-[0.04em]">
          <Link
            to="/privacy"
            className="text-ink-muted transition-colors duration-[220ms] ease-out hover:text-ink"
          >
            プライバシーポリシー
          </Link>
          <span aria-hidden className="h-3 w-px shrink-0 bg-line" />
          {/* 従業員向けの入口。お客様向けの導線と混ざらないよう、控えめに置いている */}
          <Link
            to="/login"
            className="text-ink-faint transition-colors duration-[220ms] ease-out hover:text-ink"
          >
            スタッフの方はこちら
          </Link>
        </div>
      </div>
    </footer>
  );
}
