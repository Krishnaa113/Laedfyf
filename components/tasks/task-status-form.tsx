"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/status";

export function TaskStatusForm({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(next: string) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not update task.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-white/10 p-6">
      <h2 className="text-lg font-medium">Update status</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {TASK_STATUSES.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending || item === status}
            onClick={() => void update(item)}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {TASK_STATUS_LABELS[item]}
          </button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
