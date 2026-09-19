"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CREATOR_AVAILABILITY_STATUSES,
  CREATOR_AVAILABILITY_LABELS,
} from "@/lib/status";

type WindowRow = {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  notes: string;
};

function toLocal(value: string | null) {
  if (!value) {
    return "";
  }
  return value.slice(0, 16);
}

export function AvailabilityWindows({
  creatorId,
  windows,
  canWrite,
}: {
  creatorId: string;
  windows: WindowRow[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function createWindow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const response = await fetch("/api/creator-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId,
        startsAt: String(form.get("startsAt") ?? ""),
        endsAt: String(form.get("endsAt") ?? "") || null,
        status: String(form.get("status") ?? "Unavailable"),
        notes: String(form.get("notes") ?? ""),
      }),
    });
    let data: { error?: string } = {};
    try {
      data = (await response.json()) as { error?: string };
    } catch {
      data = {};
    }
    if (!response.ok) {
      setError(data.error || "Could not save availability.");
      setPending(false);
      return;
    }
    event.currentTarget.reset();
    setPending(false);
    router.refresh();
  }

  async function removeWindow(id: string) {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/creator-availability/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Could not delete window.");
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-white/10 p-6">
      <h2 className="text-lg font-medium">Availability windows</h2>
      <p className="mt-1 text-sm text-white/60">
        Booked, unavailable, and on-hold blocks are checked before a shoot is saved.
      </p>
      {windows.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">No dated windows yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-white/10 rounded-lg border border-white/10">
          {windows.map((window) => (
            <li key={window.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm">
                  {toLocal(window.startsAt).replace("T", " ") || "—"}
                  {window.endsAt ? ` → ${toLocal(window.endsAt).replace("T", " ")}` : ""}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {window.status}
                  {window.notes ? ` · ${window.notes}` : ""}
                </p>
              </div>
              {canWrite ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeWindow(window.id)}
                  className="text-xs text-white/50 hover:text-red-400"
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <form onSubmit={createWindow} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-white/50">Starts</span>
            <input
              name="startsAt"
              type="datetime-local"
              required
              className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-white/50">Ends</span>
            <input
              name="endsAt"
              type="datetime-local"
              className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-white/50">Status</span>
            <select
              name="status"
              defaultValue="Unavailable"
              className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
            >
              {CREATOR_AVAILABILITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {CREATOR_AVAILABILITY_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-white/50">Notes</span>
            <input
              name="notes"
              className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
            />
          </label>
          {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
            >
              {pending ? "Saving…" : "Add window"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
