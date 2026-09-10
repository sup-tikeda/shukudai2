import type { ReactNode } from "react";
import { Dialog } from "@ark-ui/react/dialog";
import { Field } from "@ark-ui/react/field";
import { tv } from "tailwind-variants";

export const button = tv({
  base: "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
  variants: {
    variant: {
      primary: "bg-slate-900 text-white hover:bg-slate-700",
      outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-100",
    },
    size: {
      md: "h-10 px-4 text-sm",
      sm: "h-8 px-3 text-xs",
    },
  },
  defaultVariants: { variant: "primary", size: "md" },
});

const control = tv({
  base: "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 data-[invalid]:border-red-500",
});

const label = tv({ base: "text-sm font-medium text-slate-700" });
const errorText = tv({ base: "text-xs text-red-600" });

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
      className="flex flex-col gap-1"
    >
      <Field.Label className={label()}>
        {labelText}
        <Field.RequiredIndicator className="ml-1 text-red-600" />
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
    <Field.Root required={required} className="flex flex-col gap-1">
      <Field.Label className={label()}>
        {labelText}
        <Field.RequiredIndicator className="ml-1 text-red-600" />
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
    >
      <Dialog.Backdrop className="fixed inset-0 bg-black/40" />
      <Dialog.Positioner className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Content className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
            <Dialog.CloseTrigger
              className={button({ variant: "outline", size: "sm" })}
            >
              閉じる
            </Dialog.CloseTrigger>
          </div>
          <div className="mt-4">{children}</div>
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
    <div className="mx-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-bold">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}
