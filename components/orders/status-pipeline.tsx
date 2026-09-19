"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/status";

export function OrderStatusPipeline({
  orderId,
  status,
  canWrite,
}: {
  orderId: string;
  status: OrderStatus;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<OrderStatus>(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function setStatus(next: OrderStatus) {
    if (!canWrite || next === current || pending) {
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch(`/api/orders/${orderId}`, {
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
      setError(data.error || "Could not update status.");
      setPending(false);
      return;
    }

    setCurrent(next);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-white/40">
          Status pipeline
        </p>
        {pending ? <p className="text-xs text-brand">Saving…</p> : null}
      </div>
      <ol className="flex min-w-max items-center gap-0 overflow-x-auto">
        {ORDER_STATUSES.map((step, index) => {
          const active = step === current;
          const reached = ORDER_STATUSES.indexOf(current) >= index;
          return (
            <li key={step} className="flex items-center">
              <button
                type="button"
                disabled={!canWrite || pending}
                onClick={() => setStatus(step)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-brand text-charcoal"
                    : reached
                      ? "border border-brand/40 text-brand"
                      : "border border-white/15 text-white/50"
                } ${canWrite ? "hover:border-brand hover:text-brand" : "cursor-default"}`}
              >
                {step}
              </button>
              {index < ORDER_STATUSES.length - 1 ? (
                <span
                  className={`mx-2 h-px w-8 ${reached ? "bg-brand/50" : "bg-white/15"}`}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
