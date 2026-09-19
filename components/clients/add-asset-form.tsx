"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ASSET_KINDS } from "@/lib/status";

export function AddAssetForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch(`/api/clients/${clientId}/assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        url: String(formData.get("url") ?? ""),
        kind: String(formData.get("kind") ?? "Other"),
      }),
    });

    const data = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Could not add asset.");
      return;
    }

    form.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-3 md:grid-cols-4">
      <input
        name="name"
        placeholder="Asset name"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      <input
        name="url"
        required
        placeholder="https://…"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      <select
        name="kind"
        defaultValue="Brand Kit"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      >
        {ASSET_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add asset"}
      </button>
      {error ? <p className="md:col-span-4 text-sm text-red-400">{error}</p> : null}
    </form>
  );
}
