"use client";

import { useState } from "react";

export function RevealPassword({
  value,
  emptyLabel = "Not set",
}: {
  value?: string | null;
  emptyLabel?: string;
}) {
  const [visible, setVisible] = useState(false);

  if (!value) {
    return <span className="text-white/50">{emptyLabel}</span>;
  }

  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <input
        readOnly
        type={visible ? "text" : "password"}
        value={value}
        autoComplete="off"
        className="min-w-0 flex-1 rounded-md border border-white/15 bg-charcoal px-3 py-1.5 text-sm text-white"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="shrink-0 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-white/70 hover:border-brand hover:text-brand"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  );
}

export function PasswordInput({
  name,
  label,
  required = false,
  minLength = 8,
  autoComplete = "new-password",
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <label className="flex flex-col gap-1.5">
        <span className="text-white/70">{label}</span>
        <span className="relative block">
          <input
            name={name}
            type={visible ? "text" : "password"}
            required={required}
            minLength={minLength}
            autoComplete={autoComplete}
            className="w-full rounded-md border border-white/15 bg-charcoal px-3 py-2 pr-16 text-white outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-white/60 hover:text-brand"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      {hint ? <p className="text-xs text-white/45">{hint}</p> : null}
    </div>
  );
}
