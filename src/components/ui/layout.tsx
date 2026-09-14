import type { ReactNode } from "react";
import { Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { tv } from "tailwind-variants";
import { button } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";

/**
 * 左サイドバーに出す業務メニュー。
 * 顧客 → 車両 → 案件 → 見積・請求と、実際の仕事の流れの順に並べている。
 */
const navLinks = [
  { to: "/", label: "ダッシュボード", icon: IconDashboard },
  { to: "/customers", label: "顧客", icon: IconCustomer },
  { to: "/vehicles", label: "車両", icon: IconVehicle },
  { to: "/cases", label: "案件", icon: IconCase },
  { to: "/quotes", label: "見積・請求", icon: IconQuote },
] as const;

const navLink = tv({
  // 選択中は塗りつぶし。薄い色違いではなく面で示して、現在地をひと目で分かるようにする
  base: "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-bold transition-colors",
  variants: {
    active: {
      true: "bg-accent text-accent-ink shadow-sm shadow-accent/30",
      false: "text-ink-muted hover:bg-surface-raised hover:text-ink",
    },
  },
});

export function AppShell({
  children,
  fill,
}: {
  children: ReactNode;
  /**
   * 一覧画面のように「見出しは動かさず、一覧の中だけをスクロールさせたい」画面で使う。
   * 本文そのものはスクロールしなくなるので、`Card` の `fill` と必ずセットで使うこと。
   */
  fill?: boolean;
}) {
  const router = useRouter();
  // ルート直下の loader が返すログイン情報。admin のときだけ「設定」を出す
  const sessionUser = useLoaderData({ from: "__root__" });
  const isAdmin = sessionUser?.role === "admin";

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/login" });
  }

  /**
   * サイドバーの中身。狭い画面では上部の横並びメニューとして同じものを使うため、
   * 向き（縦／横）だけ差し替えられるようにしている。
   */
  const menu = (
    <>
      {navLinks.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          // ダッシュボードは全画面の親パスになるため、完全一致のときだけ選択中にする
          activeOptions={item.to === "/" ? { exact: true } : undefined}
          className={navLink({ active: false })}
          activeProps={{ className: navLink({ active: true }) }}
        >
          <item.icon />
          {item.label}
        </Link>
      ))}
    </>
  );

  return (
    // 画面の高さに収める。はみ出す部分は本文の中だけでスクロールさせる
    <div className="flex h-screen overflow-hidden bg-shell text-ink">
      {/* 左サイドバー。広い画面では常に出したままにして、現在地が分かるようにする */}
      {/* 高さは親（h-screen）に合わせて自動で伸びる（align-items: stretch） */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <Link to="/" className="flex items-center gap-2.5 px-5 py-4">
          <BrandMark />
          <span className="leading-tight">
            <span className="block text-sm font-black tracking-widest text-ink uppercase">
              Ikeda
            </span>
            <span className="block text-[10px] text-ink-faint">店舗管理</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">{menu}</nav>

        {/* 下端＝たまにしか使わない設定と、自分自身の操作。業務メニューと離して置く */}
        <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
          {isAdmin ? (
            <Link
              to="/master"
              className={navLink({ active: false })}
              activeProps={{ className: navLink({ active: true }) }}
            >
              <IconSettings />
              設定
            </Link>
          ) : null}
          {sessionUser ? (
            <p className="px-3 pt-1 text-[11px] text-ink-faint">
              {sessionUser.name} でログイン中
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            className={button({
              variant: "ghost",
              size: "sm",
              className: "justify-start",
            })}
          >
            ログアウト
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* 狭い画面向け。サイドバーの代わりに上部へ横並びで出す */}
        <header className="z-30 shrink-0 border-b border-line bg-surface lg:hidden">
          <div className="flex items-center gap-2 px-4 py-2.5">
            <Link to="/" className="flex items-center gap-2">
              <BrandMark />
            </Link>
            <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
              {menu}
            </nav>
            <button
              type="button"
              onClick={handleSignOut}
              className={button({ variant: "ghost", size: "sm" })}
            >
              ログアウト
            </button>
          </div>
        </header>

        {/*
          高さはflexだけで決める（min-height:100% のようなパーセント指定は使わない）。
          パーセントの高さは「親の高さが確定していること」が条件で、条件が崩れると
          子が高さいっぱいに広がらず、ページ全体がスクロールしてしまうため。

          fill のときは本文そのものをスクロールさせない（overflow-hidden）。
          こうすると見出しや絞り込みは**構造的に**スクロール領域の外側に置かれるので、
          高さの計算がどうであれ動きようがない。スクロールするのは一覧の中だけになる。
        */}
        <main
          className={[
            "flex min-h-0 flex-1 flex-col",
            fill ? "overflow-hidden" : "overflow-y-auto",
          ].join(" ")}
        >
          <div className="mx-auto flex min-h-0 w-full max-w-5xl min-w-0 flex-1 flex-col px-4 py-6 sm:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/** 店のシンボル。六角ボルトを模した図形で、画像を使わずに作っている */
function BrandMark() {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent text-sm font-black text-accent-ink"
      style={{
        clipPath: "polygon(25% 2%, 75% 2%, 100% 50%, 75% 98%, 25% 98%, 0% 50%)",
      }}
    >
      I
    </span>
  );
}

/**
 * メニューのアイコン。アイコン用のライブラリは入れず、単純な図形で描いている
 * （Cloudflare Workers のスクリプトサイズを増やさないため）。
 */
function iconProps() {
  return {
    viewBox: "0 0 20 20",
    className: "h-4 w-4 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

function IconDashboard() {
  return (
    <svg {...iconProps()}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}

function IconCustomer() {
  return (
    <svg {...iconProps()}>
      <circle cx="10" cy="6.5" r="3.2" />
      <path d="M3.5 17c0-3.2 2.9-5.2 6.5-5.2s6.5 2 6.5 5.2" />
    </svg>
  );
}

/** 車両。前後のホイールとハンドルでバイクを表している */
function IconVehicle() {
  return (
    <svg {...iconProps()}>
      <circle cx="4.5" cy="13.5" r="3" />
      <circle cx="15.5" cy="13.5" r="3" />
      <path d="M4.5 13.5 8 7.5h4l3.5 6" />
      <path d="M11 4.5h3" />
    </svg>
  );
}

/** 案件。作業指示をイメージしたクリップボード */
function IconCase() {
  return (
    <svg {...iconProps()}>
      <rect x="4" y="3.5" width="12" height="14" rx="2" />
      <path d="M7.5 3.5V2.5h5v1" />
      <path d="M7.5 8.5h5M7.5 12h3.5" />
    </svg>
  );
}

/** 見積・請求。金額の入った書類 */
function IconQuote() {
  return (
    <svg {...iconProps()}>
      <path d="M5 2.5h7l3 3v12H5z" />
      <path d="M11.5 2.5v3.5H15" />
      <path d="M7.5 10.5h5M7.5 13.5h3" />
    </svg>
  );
}

/** 設定。つまみ付きのスライダーで表している */
function IconSettings() {
  return (
    <svg {...iconProps()}>
      <path d="M3 6h14M3 14h14" />
      <circle cx="8" cy="6" r="2" />
      <circle cx="13" cy="14" r="2" />
    </svg>
  );
}

/**
 * 画面の見出し。右側に主操作ボタンなどを置ける。
 * 全画面で同じ体裁（オレンジの縦棒＋小見出し＋タイトル）にするため、
 * ダッシュボードもこの部品を使っている。
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  backTo,
  backLabel,
  actions,
}: {
  /** タイトルの上に小さく出す英字ラベル（CSSで大文字にする） */
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    // 見出しは画面の起点。左のオレンジの縦棒で「ここから始まる」ことを示す
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div className="flex min-w-0 gap-3.5">
        <span
          aria-hidden
          className="mt-1 w-1 shrink-0 rounded-full bg-accent"
        />
        <div className="min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              className="text-xs font-bold tracking-wide text-ink-faint uppercase transition-colors hover:text-accent"
            >
              ← {backLabel}
            </Link>
          ) : null}
          {eyebrow ? (
            <p className="text-[11px] font-black tracking-[0.25em] text-accent uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-0.5 text-2xl font-black tracking-tight break-words">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-ink-muted break-words">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

/** 情報のまとまり。一覧・詳細のどちらでも使う土台。 */
export function Card({
  title,
  count,
  actions,
  fill,
  children,
}: {
  title?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  /** 残りの高さいっぱいに広げ、中身だけをスクロールさせる（一覧画面で使う） */
  fill?: boolean;
  children: ReactNode;
}) {
  return (
    // 白いカードを地の色から浮かせ、見出し帯だけ薄く敷いて中身と区切る
    <section
      className={[
        "overflow-hidden rounded-xl border border-line bg-surface shadow-sm shadow-ink/5",
        // fill: 残りの高さいっぱいに広がり、中身だけがスクロールする。
        // 一覧が長くなっても画面の外へはみ出さず、見出しと件数が常に見えるようにするため。
        // min-h-0 が無いと flex の子は縮まず、カードが画面外へあふれる。
        fill ? "flex min-h-0 min-w-0 flex-1 flex-col" : "",
      ].join(" ")}
    >
      {title ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised px-5 py-3">
          <h2 className="flex items-baseline gap-2.5 text-sm font-black tracking-wide">
            {title}
            {count !== undefined ? (
              <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-bold text-ink-faint ring-1 ring-line ring-inset">
                {count}
              </span>
            ) : null}
          </h2>
          {actions ? <div className="flex gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {fill ? (
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      ) : (
        children
      )}
    </section>
  );
}

/**
 * 一覧の表。項目ごとに列を分けて並べる。
 *
 * 1行にまとめて書くより、列で揃っているほうが同じ項目を縦に見比べられるため、
 * 件数の多い一覧画面ではこちらを使う（詳細画面の小さな一覧は `Row` のまま）。
 *
 * 見出し行は `sticky` でカードの中に貼り付ける。カードの中身だけがスクロールするので、
 * 下までスクロールしても「どの列が何か」が分からなくならない。
 */
export type Column<T> = {
  /** Reactのkeyと、列の識別に使う */
  key: string;
  header: ReactNode;
  /** 数値や操作ボタンなど、左揃え以外にしたい列で使う */
  align?: "left" | "right" | "center";
  /**
   * 列幅の指定（Tailwindのクラス）。
   *
   * 基本は指定せず、ブラウザの自動配分（内容の長さに応じた割り振り）に任せる。
   * 特定の列に `w-full` を付けるとその列が余白を全部吸ってしまい、
   * 名前が短いときに大きな空白ができて不格好になるため使わない。
   * 潰れると困る列にだけ `min-w-[10rem]` のように下限を決める。
   */
  width?: string;
  render: (row: T) => ReactNode;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const alignOf = (align: Column<T>["align"]) =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    // 列が多いので、表の中だけ本文より一段小さい文字にして収まりを良くする。
    // 最小幅を決めておき、狭い画面では列を潰さず横スクロールさせる。
    <table className="w-full min-w-[44rem] border-collapse text-[13px]">
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={[
                // カードの中身がスクロールしても、見出し行だけは上に残す
                "sticky top-0 z-10 border-b border-line bg-surface-raised px-3 py-2",
                "text-[11px] font-bold tracking-wide whitespace-nowrap text-ink-faint",
                alignOf(column.align),
                column.width ?? "",
              ].join(" ")}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className="border-b border-line transition-colors last:border-b-0 hover:bg-surface-raised"
          >
            {columns.map((column) => (
              <td
                key={column.key}
                className={[
                  "px-3 py-2.5 align-middle",
                  alignOf(column.align),
                ].join(" ")}
              >
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 一覧の1行。左に内容、右に操作ボタンを置く。 */
export function Row({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    // ホバー時は左端にオレンジの線を出し、いまどの行を見ているかを分かりやすくする
    <li className="group relative flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-raised">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 scale-y-0 bg-accent transition-transform group-hover:scale-y-100"
      />
      <div className="min-w-0 flex-1">{children}</div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </li>
  );
}

export function RowList({ children }: { children: ReactNode }) {
  return <ul>{children}</ul>;
}

/** 一覧が空のときの案内。 */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-ink-faint">{message}</p>
  );
}

/**
 * 一覧の絞り込み・並べ替え。
 * 扱う件数が多くない業務のため、サーバーへ問い合わせ直さず画面側で処理する
 * （入力するたびに即座に絞り込めるようにするため）。
 */
export function ListToolbar({
  query,
  onQueryChange,
  placeholder,
  sortKey,
  onSortChange,
  sortOptions,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder: string;
  sortKey: string;
  onSortChange: (value: string) => void;
  sortOptions: { value: string; label: string }[];
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label="絞り込み"
          className="w-full rounded-md border border-line bg-surface py-2 pr-3 pl-9 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-faint"
        >
          ○
        </span>
      </div>
      <select
        value={sortKey}
        onChange={(event) => onSortChange(event.target.value)}
        aria-label="並べ替え"
        className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {query ? (
        <button
          type="button"
          onClick={() => onQueryChange("")}
          className={button({ variant: "ghost", size: "sm" })}
        >
          条件をクリア
        </button>
      ) : null}
    </div>
  );
}

/**
 * 終了予定日までの残り日数（元FileMakerの「作業：残り日数」に相当）。
 * 過ぎている場合は 0 を返す。日付が未設定なら null。
 */
export function remainingDays(endOn: string | null | undefined) {
  if (!endOn) return null;
  const end = new Date(`${endOn}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);
  return diff < 0 ? 0 : diff;
}

/** 検索語がどれかの項目に含まれるかを判定する（全角・半角と大文字小文字は区別しない） */
export function matchesQuery(query: string, values: (string | null | undefined)[]) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return values.some((value) => (value ?? "").toLowerCase().includes(needle));
}

const badge = tv({
  base: "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  variants: {
    tone: {
      neutral: "bg-surface-raised text-ink-muted ring-1 ring-line ring-inset",
      accent: "bg-accent/10 text-accent ring-1 ring-accent/25 ring-inset",
      done: "bg-success/10 text-success ring-1 ring-success/25 ring-inset",
      info: "bg-info/10 text-info ring-1 ring-info/25 ring-inset",
    },
  },
  defaultVariants: { tone: "neutral" },
});

type BadgeTone = "neutral" | "accent" | "done" | "info";

export function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <span className={badge({ tone })}>{children}</span>;
}

/** 案件ステータスの色分け。作業中はアクセント、完了は緑、未着手は無彩色。 */
export function statusTone(status: string): BadgeTone {
  if (status === "作業中") return "accent";
  if (status === "完了済み") return "done";
  return "neutral";
}

/** 見積書と請求書を見分けやすくする。 */
export function docTypeTone(docType: string): BadgeTone {
  return docType === "請求書" ? "accent" : "info";
}

/** 詳細画面の項目。値が無いときは「-」を出す。 */
export function DetailItem({
  label,
  children,
  wide,
}: {
  label: string;
  children?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs font-medium tracking-wide text-ink-faint uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap">
        {children || <span className="text-ink-faint">-</span>}
      </dd>
    </div>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-5 py-5 sm:grid-cols-2">
      {children}
    </dl>
  );
}

/**
 * ダッシュボードの数値タイル。
 *
 * tone で強調の仕方を変える。
 * - accent：オレンジで塗りつぶす。いちばん見てほしい数字1枚だけに使う
 * - danger：数字だけ赤くする。要対応（0件なら通常表示に戻す）を示す
 *
 * sub には「未作業 3 / 作業中 2」のような補足を1行だけ添えられる。
 */
export function StatTile({
  label,
  value,
  unit,
  tone = "default",
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: "default" | "accent" | "danger";
  sub?: string;
}) {
  const accent = tone === "accent";

  return (
    <div
      className={[
        "rounded-xl px-4 py-3.5 shadow-sm",
        accent
          ? "bg-accent shadow-accent/30"
          : "border border-line bg-surface shadow-ink/5",
      ].join(" ")}
    >
      <p
        className={`text-[11px] font-bold tracking-wide whitespace-nowrap uppercase ${
          accent ? "text-accent-ink/80" : "text-ink-faint"
        }`}
      >
        {label}
      </p>
      <p
        className={[
          "mt-1 text-2xl font-black tracking-tight whitespace-nowrap tabular-nums",
          accent ? "text-accent-ink" : tone === "danger" ? "text-danger" : "",
        ].join(" ")}
      >
        {value}
        {unit ? (
          <span
            className={`ml-0.5 text-sm font-bold ${
              accent ? "text-accent-ink/80" : "text-ink-muted"
            }`}
          >
            {unit}
          </span>
        ) : null}
      </p>
      {sub ? (
        <p
          className={`mt-0.5 text-[11px] whitespace-nowrap ${
            accent ? "text-accent-ink/70" : "text-ink-faint"
          }`}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}
