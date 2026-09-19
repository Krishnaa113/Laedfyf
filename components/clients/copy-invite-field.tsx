"use client";

import { useState } from "react";

export function CopyInviteField({
  url,
  expiresAt,
}: {
  url: string;
  expiresAt?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-charcoal px-3 py-2 text-xs text-white outline-none"
        />
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-charcoal"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
      <p className="text-xs text-white/50">
        Copy this and send it yourself (WhatsApp, email, etc.). Generating a new
        link invalidates the previous one.
        {expiresAt
          ? ` Expires ${new Date(expiresAt).toLocaleString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}.`
          : " Valid for 7 days."}
      </p>
    </div>
  );
}
