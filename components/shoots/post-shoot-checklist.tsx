"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const POST_SHOOT_ITEMS = [
  { key: "footageUploaded", label: "Footage uploaded" },
  { key: "rawIntegrityChecked", label: "Raw integrity checked" },
  { key: "reshootRequired", label: "Reshoot required" },
] as const;

type PostShootState = {
  footageUploaded: boolean;
  rawIntegrityChecked: boolean;
  reshootRequired: boolean;
};

export function PostShootChecklist({
  shootId,
  footageUploaded,
  rawIntegrityChecked,
  reshootRequired,
  canWrite,
}: {
  shootId: string;
  footageUploaded: boolean;
  rawIntegrityChecked: boolean;
  reshootRequired: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<PostShootState>({
    footageUploaded,
    rawIntegrityChecked,
    reshootRequired,
  });
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function toggle(key: keyof PostShootState) {
    if (!canWrite || pendingKey) {
      return;
    }
    const next = { ...current, [key]: !current[key] };
    setPendingKey(key);
    setError(null);
    const response = await fetch(`/api/shoots/${shootId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    let data: { error?: string } = {};
    try {
      data = (await response.json()) as { error?: string };
    } catch {
      data = {};
    }
    if (!response.ok) {
      setError(data.error || "Could not update post-shoot status.");
      setPendingKey(null);
      return;
    }
    setCurrent(next);
    setPendingKey(null);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-white/10 p-6">
      <div className="mb-4">
        <h2 className="text-sm font-medium">Post-shoot</h2>
        <p className="mt-1 text-xs text-white/50">
          Footage, raw integrity, and reshoot flags after the shoot wraps.
        </p>
      </div>
      <ul className="grid gap-2 md:grid-cols-3">
        {POST_SHOOT_ITEMS.map((item) => (
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
