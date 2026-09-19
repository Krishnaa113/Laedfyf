"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteVideoButton({
  videoId,
  label,
}: {
  videoId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (pending || !window.confirm(`Delete ${label}?`)) {
      return;
    }
    setPending(true);
    const response = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    if (!response.ok) {
      setPending(false);
      return;
    }
    router.push("/videos");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={pending}
      className="rounded-md border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:border-red-400 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
