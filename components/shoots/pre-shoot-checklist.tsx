"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRE_SHOOT_CHECKLIST_ITEMS,
  isPreShootChecklistComplete,
  type PreShootChecklist,
} from "@/lib/shoots/checklist";

export function PreShootChecklist({
  shootId,
  checklist,
  canWrite,
}: {
  shootId: string;
  checklist: PreShootChecklist;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(checklist);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const complete = isPreShootChecklistComplete(current);

  async function toggle(key: keyof PreShootChecklist) {
    if (!canWrite || pendingKey) {
      return;
    }

    const next = { ...current, [key]: !current[key] };
    setPendingKey(key);
    setError(null);

    const response = await fetch(`/api/shoots/${shootId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checklist: next }),
    });

    let data: { error?: string } = {};
    try {
      data = (await response.json()) as { error?: string };
    } catch {
      data = {};
    }

    if (!response.ok) {
      setError(data.error || "Could not update checklist.");
      setPendingKey(null);
      return;
    }

    setCurrent(next);
    setPendingKey(null);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-white/10 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">Pre-shoot checklist</h2>
          <p className="mt-1 text-xs text-white/50">
            In Progress stays blocked until every item is complete.
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            complete
              ? "bg-brand/20 text-brand"
              : "border border-white/15 text-white/60"
          }`}
        >
          {complete ? "Ready" : "Incomplete"}
        </span>
      </div>
      <ul className="grid gap-2 md:grid-cols-2">
        {PRE_SHOOT_CHECKLIST_ITEMS.map((item) => (
          <li key={item.key}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={current[item.key]}
                disabled={!canWrite || pendingKey === item.key}
                onChange={() => toggle(item.key)}
                className="accent-brand"
              />
              <span>{item.label}</span>
            </label>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
