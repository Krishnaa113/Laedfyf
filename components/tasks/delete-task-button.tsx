"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTaskButton({
  taskId,
  label,
}: {
  taskId: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    if (!window.confirm(`Delete task “${label}”?`)) {
      return;
    }
    setPending(true);
    const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    setPending(false);
    if (!response.ok) {
      return;
    }
    router.push("/tasks");
    router.refresh();
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => void onDelete()}
      className="rounded-md border border-red-500/30 px-4 py-2 text-sm text-red-300 hover:border-red-400 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
