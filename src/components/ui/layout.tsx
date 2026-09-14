import type { ReactNode } from "react";
import { Link, useLoaderData, useRouter } from "@tanstack/react-router";
import { tv } from "tailwind-variants";
import { button } from "~/components/ui/form";
import { signOut } from "~/lib/auth-client";

/** 画面上部の固定ナビ。各画面から「ダッシュボードへ戻る」導線を無くし、常に全画面へ移動できるようにする。 */
const navLinks = [
  { to: "/customers", label: "顧客" },
  { to: "/vehicles", label: "車両" },
  { to: "/cases", label: "案件" },
  { to: "/quotes", label: "見積・請求" },
] as const;

const navLink = tv({
  // 選択中は塗りつぶし。薄い色違いではなく面で示して、現在地をひと目で分かるようにする
  base: "rounded-md px-3.5 py-1.5 text-sm font-bold transition-colors",
  variants: {
    active: {
      true: "bg-accent text-accent-ink shadow-sm shadow-accent/30",
      false: "text-ink-muted hover:bg-surface-raised hover:text-ink",
    },
  },
});

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  // ルート直下の loader が返すログイン情報。admin のときだけ「設定」を出す
  const sessionUser = useLoaderData({ from: "__root__" });
  const isAdmin = sessionUser?.role === "admin";

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-shell text-ink">
      <header className="sticky top-0 z-10 border-b-2 border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            {/* ブランド表示。六角ボルトを模したオレンジの印が全画面共通の目印になる */}
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center bg-accent text-sm font-black text-accent-ink"
              style={{
                clipPath:
                  "polygon(25% 2%, 75% 2%, 100% 50%, 75% 98%, 25% 98%, 0% 50%)",
              }}
            >
              I
            </span>
            <span className="text-sm font-black tracking-widest text-ink uppercase">
              Ikeda
            </span>
          </Link>

          {/* 左＝毎日使う業務。顧客→車両→案件→見積請求と、実際の仕事の順に並べている */}
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={navLink({ active: false })}
                activeProps={{ className: navLink({ active: true }) }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* 右＝たまにしか使わない設定と、自分自身の操作。縦線で業務メニューと分ける */}
          <div className="flex items-center gap-1 border-l border-line pl-3">
            {isAdmin ? (
              <Link
                to="/master"
                className={navLink({ active: false })}
                activeProps={{ className: navLink({ active: true }) }}
              >
                設定
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              className={button({ variant: "ghost", size: "sm" })}
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

/** 画面の見出し。右側に主操作ボタンなどを置ける。 */
export function PageHeader({
  title,
  subtitle,
  backTo,
  backLabel,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    // 見出しは画面の起点。左のオレンジの縦棒で「ここから始まる」ことを示す
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
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
          <h1 className="mt-0.5 text-3xl font-black tracking-tight break-words">
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
  children,
}: {
  title?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    // 白いカードを地の色から浮かせ、見出し帯だけ薄く敷いて中身と区切る
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm shadow-ink/5">
      {title ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-raised px-5 py-3">
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
      {children}
    </section>
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
    <div className="mb-4 flex flex-wrap items-center gap-2">
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
 * accent を付けたものだけオレンジで塗り、いちばん見てほしい数字を1つに絞る。
 */
export function StatTile({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl bg-accent px-4 py-4 shadow-sm shadow-accent/30"
          : "rounded-xl border border-line bg-surface px-4 py-4 shadow-sm shadow-ink/5"
      }
    >
      <p
        className={`text-xs font-bold tracking-wide uppercase ${
          accent ? "text-accent-ink/80" : "text-ink-faint"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1.5 text-3xl font-black tracking-tight tabular-nums ${
          accent ? "text-accent-ink" : ""
        }`}
      >
        {value}
        {unit ? (
          <span
            className={`ml-1 text-sm font-bold ${
              accent ? "text-accent-ink/80" : "text-ink-muted"
            }`}
          >
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}
