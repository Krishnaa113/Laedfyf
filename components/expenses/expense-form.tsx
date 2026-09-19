"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/status";

export function ExpenseForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/expenses", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save expense.");
      return;
    }
    router.push("/expenses");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Category</span>
        <select
          name="category"
          required
          defaultValue="Office"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {EXPENSE_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Amount</span>
          <input
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Date</span>
          <input
            name="date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Receipt</span>
        <input
          name="receipt"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-brand file:px-3 file:py-1 file:text-charcoal"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Notes</span>
        <textarea
          name="notes"
          rows={3}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : "Record expense"}
      </button>
    </form>
  );
}
