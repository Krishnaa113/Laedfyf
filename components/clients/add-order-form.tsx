"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddOrderForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        packageName: String(formData.get("packageName") ?? ""),
        contractedVideoCount: Number(formData.get("contractedVideoCount") ?? 1),
        pricing: Number(formData.get("pricing") ?? 0),
        gstTax: Number(formData.get("gstTax") ?? 0),
      }),
    });

    const data = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Could not create order.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-5">
      <input
        name="packageName"
        required
        placeholder="Package name"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      <input
        name="contractedVideoCount"
        type="number"
        min={1}
        defaultValue={1}
        required
        placeholder="Video count"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      <input
        name="pricing"
        type="number"
        min={0}
        defaultValue={0}
        placeholder="Pricing"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      <input
        name="gstTax"
        type="number"
        min={0}
        defaultValue={0}
        placeholder="GST / Tax"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add order"}
      </button>
      {error ? <p className="md:col-span-5 text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
