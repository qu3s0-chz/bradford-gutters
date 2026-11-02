"use client";

import { useState, type ReactNode } from "react";

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-foreground";

export function Section({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-4 ${className}`}>
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  const [text, setText] = useState(String(value));
  const [shown, setShown] = useState(value);

  // Follow outside changes, such as a reset, without fighting the user's typing.
  if (value !== shown) {
    setShown(value);
    setText(String(value));
  }

  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="relative block">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            const next = Number(event.target.value);
            if (event.target.value.trim() !== "" && Number.isFinite(next)) {
              setShown(next);
              onChange(next);
            }
          }}
          className={`${inputClass} ${suffix ? "pr-12" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 mt-1 flex items-center text-sm text-muted">
            {suffix}
          </span>
        )}
      </span>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; group?: string }[];
}) {
  const groups = [...new Set(options.map((o) => o.group))];

  return (
    <label className="block text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
        {groups.map((group) => {
          const items = options
            .filter((o) => o.group === group)
            .map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ));
          return group ? (
            <optgroup key={group} label={group}>
              {items}
            </optgroup>
          ) : (
            items
          );
        })}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-5 accent-brand"
      />
      {label}
    </label>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-brand text-white",
    secondary: "border border-line bg-surface text-foreground",
    danger: "border border-line bg-surface text-danger",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      className={`h-11 rounded-lg px-4 text-sm font-medium ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
