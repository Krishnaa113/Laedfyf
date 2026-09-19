"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteCreatorButton({
  creatorId,
  name,
}: {
  creatorId: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (!window.confirm(`Delete creator ${name}?`)) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch(`/api/creators/${creatorId}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Could not delete creator.");
      return;
    }

    router.push("/creators");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:border-red-400 hover:text-red-200 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
