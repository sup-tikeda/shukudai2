import type { ReactNode } from "react";
import { Dialog } from "@ark-ui/react/dialog";
import { Field } from "@ark-ui/react/field";
import { tv } from "tailwind-variants";

export const button = tv({
  base: "inline-flex items-center justify-center gap-1.5 rounded-md font-bold tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40",
  variants: {
    variant: {
      // 主操作。工具のオレンジで、画面内で1番目立たせたいものだけに使う
      primary:
        "bg-accent text-accent-ink shadow-sm shadow-accent/30 hover:bg-accent-strong",
      // 併置する副操作
      outline:
        "border border-line bg-surface text-ink hover:border-accent hover:text-accent",
      // 一覧の行内など、枠線を出すとうるさい場所
      ghost: "text-ink-muted hover:bg-surface-raised hover:text-ink",
      // 削除など戻せない操作
      danger:
        "border border-danger/30 bg-danger/8 text-danger hover:bg-danger/15",
    },
    size: {
      md: "h-10 px-4 text-sm",
      sm: "h-8 px-3 text-xs",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

const control = tv({
  base: "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/20 data-[invalid]:border-danger",
});

const label = tv({
  base: "text-xs font-medium tracking-wide text-ink-muted uppercase",
});
const errorText = tv({ base: "text-xs text-danger" });

type TextFieldProps = {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "date";
  required?: boolean;
  invalid?: boolean;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
  multiline?: boolean;
  rows?: number;
  /** 入力候補（手入力も可能なまま、候補一覧をブラウザ標準の入力補助として出す） */
  suggestions?: string[];
};

export function TextField({
  name,
  label: labelText,
  type = "text",
  required,
  invalid,
  error,
  defaultValue,
  autoComplete,
  multiline,
  rows = 6,
  suggestions,
}: TextFieldProps) {
  const datalistId = suggestions ? `${name}-list` : undefined;
  return (
    <Field.Root
      required={required}
      invalid={invalid}
      className="flex flex-col gap-1.5"
    >
      <Field.Label className={label()}>
        {labelText}
        <Field.RequiredIndicator className="ml-1 text-accent" />
      </Field.Label>
      {multiline ? (
        <Field.Textarea
          name={name}
          rows={rows}
          defaultValue={defaultValue}
          className={control()}
        />
      ) : (
        <Field.Input
          name={name}
          type={type}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          list={datalistId}
          className={control()}
        />
      )}
      {suggestions ? (
        <datalist id={datalistId}>
          {suggestions.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
      ) : null}
      {error ? (
        <Field.ErrorText className={errorText()}>{error}</Field.ErrorText>
      ) : null}
    </Field.Root>
  );
}

type SelectFieldProps = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
};

export function SelectField({
  name,
  label: labelText,
  options,
  defaultValue,
  required,
}: SelectFieldProps) {
  return (
    <Field.Root required={required} className="flex flex-col gap-1.5">
      <Field.Label className={label()}>
        {labelText}
        <Field.RequiredIndicator className="ml-1 text-accent" />
      </Field.Label>
      <select name={name} defaultValue={defaultValue} className={control()}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field.Root>
  );
}

/** 新規作成・編集用のポップアップ */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      // 閉じたら中身をDOMから取り除く。これが無いとフォームがマウントされたまま残り、
      // 非制御の入力欄（defaultValue）が前回開いた行の値を保持してしまう。
      // 別の行を編集したつもりで前の行の値を保存する、という事故につながるため必須。
      lazyMount
      unmountOnExit
    >
      <Dialog.Backdrop className="fixed inset-0 bg-ink/25 backdrop-blur-sm" />
      <Dialog.Positioner className="fixed inset-0 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <Dialog.Content className="my-auto w-full max-w-md rounded-xl border border-line bg-surface shadow-xl shadow-ink/10">
          <div className="flex items-center justify-between gap-2 border-b border-line px-6 py-4">
            <Dialog.Title className="text-base font-bold text-ink">
              {title}
            </Dialog.Title>
            <Dialog.CloseTrigger
              className={button({ variant: "ghost", size: "sm" })}
            >
              閉じる
            </Dialog.CloseTrigger>
          </div>
          <div className="px-6 py-5">{children}</div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}

export function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-line bg-surface p-8 shadow-xl shadow-ink/10">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-ink-muted">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}
