"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TICKET_STATUSES, TICKET_STATUS_LABELS } from "@/lib/status";

export function TicketStatusForm({
  ticketId,
  status,
}: {
  ticketId: string;
  status: string;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onChange(next: string) {
    if (next === current || pending) {
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    let data: { error?: string } = {};
    try {
      data = (await response.json()) as { error?: string };
    } catch {
      data = {};
    }
    if (!response.ok) {
      setError(data.error || "Could not update ticket.");
      setPending(false);
      return;
    }
    setCurrent(next);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        value={current}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      >
        {TICKET_STATUSES.map((item) => (
          <option key={item} value={item}>
            {TICKET_STATUS_LABELS[item]}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
