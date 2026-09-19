"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TicketCreateForm({
  orders,
}: {
  orders: { id: string; packageName: string }[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim()) {
      setError("Subject is required.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        body,
        orderId: orderId || null,
      }),
    });
    const data = (await response.json()) as { error?: string; ticket?: { id: string } };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not create ticket.");
      return;
    }
    setSubject("");
    setBody("");
    setOrderId("");
    if (data.ticket?.id) {
      router.push(`/portal/tickets/${data.ticket.id}`);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-lg border border-white/10 p-6"
    >
      <h2 className="text-lg font-medium">New ticket</h2>
      <input
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder="Subject"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      {orders.length > 0 ? (
        <select
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
        >
          <option value="">No related package</option>
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.packageName}
            </option>
          ))}
        </select>
      ) : null}
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={4}
        placeholder="Describe the issue"
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Sending…" : "Create ticket"}
      </button>
    </form>
  );
}
