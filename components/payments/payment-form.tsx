"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  normalizePaymentStatus,
} from "@/lib/status";

type ClientOption = { id: string; name: string; companyName: string };
type OrderOption = { id: string; packageName: string; clientId: string | null };

export function PaymentForm({
  paymentId,
  initialValues,
}: {
  paymentId?: string;
  initialValues?: {
    clientId?: string;
    orderId?: string | null;
    invoiceAmount?: number;
    amountReceived?: number;
    paymentDate?: string;
    method?: string;
    transactionRef?: string;
    notes?: string;
    status?: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [clientId, setClientId] = useState(initialValues?.clientId ?? "");
  const [invoiceAmount, setInvoiceAmount] = useState(initialValues?.invoiceAmount ?? 0);
  const [amountReceived, setAmountReceived] = useState(
    initialValues?.amountReceived ?? 0,
  );
  const pendingBalance = useMemo(
    () => Number(invoiceAmount) - Number(amountReceived),
    [invoiceAmount, amountReceived],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [clientRes, orderRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/orders"),
      ]);
      if (clientRes.ok) {
        const data = (await clientRes.json()) as { clients?: ClientOption[] };
        if (!cancelled) {
          setClients(data.clients ?? []);
        }
      }
      if (orderRes.ok) {
        const data = (await orderRes.json()) as { orders?: OrderOption[] };
        if (!cancelled) {
          setOrders(data.orders ?? []);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const clientOrders = orders.filter((order) => !clientId || order.clientId === clientId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      clientId,
      orderId: String(form.get("orderId") ?? "") || null,
      invoiceAmount,
      amountReceived,
      paymentDate: String(form.get("paymentDate") ?? "") || null,
      method: String(form.get("method") ?? ""),
      transactionRef: String(form.get("transactionRef") ?? ""),
      notes: String(form.get("notes") ?? ""),
      status: String(form.get("status") ?? "Unpaid"),
    };
    const response = await fetch(
      paymentId ? `/api/payments/${paymentId}` : "/api/payments",
      {
        method: paymentId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await response.json()) as { error?: string; payment?: { id: string } };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save invoice.");
      return;
    }
    router.push(data.payment?.id ? `/payments/${data.payment.id}` : "/payments");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Client</span>
        <select
          required
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">Select client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName || client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Order</span>
        <select
          name="orderId"
          defaultValue={initialValues?.orderId ?? ""}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">No linked package</option>
          {clientOrders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.packageName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Invoice amount</span>
          <input
            type="number"
            min={0}
            step="0.01"
            required
            value={invoiceAmount}
            onChange={(event) => setInvoiceAmount(Number(event.target.value))}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Amount received</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amountReceived}
            onChange={(event) => setAmountReceived(Number(event.target.value))}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Pending balance</span>
          <input
            readOnly
            value={pendingBalance}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white/80"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Payment date</span>
          <input
            type="date"
            name="paymentDate"
            defaultValue={initialValues?.paymentDate?.slice(0, 10) ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={normalizePaymentStatus(initialValues?.status)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Method</span>
        <input
          name="method"
          defaultValue={initialValues?.method ?? ""}
          placeholder="UPI, NEFT, card…"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Transaction ref</span>
        <input
          name="transactionRef"
          defaultValue={initialValues?.transactionRef ?? ""}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Notes</span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : paymentId ? "Save invoice" : "Create invoice"}
      </button>
    </form>
  );
}
