"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SCRIPT_STATUSES,
  SCRIPT_STATUS_LABELS,
  normalizeScriptStatus,
} from "@/lib/status";

export type ScriptFormValues = {
  clientId: string;
  orderId: string;
  videoNumber: number;
  writerId: string;
  creatorId: string;
  language: string;
  scriptText: string;
  referenceLinks: string;
  deadline: string;
  status: string;
};

type ClientOption = { id: string; name: string; companyName: string };
type OrderOption = { id: string; packageName: string; clientId: string | null };
type EmployeeOption = { id: string; name: string; email: string; jobTitle: string };
type CreatorOption = { id: string; name: string; location: string };

const EMPTY: ScriptFormValues = {
  clientId: "",
  orderId: "",
  videoNumber: 1,
  writerId: "",
  creatorId: "",
  language: "",
  scriptText: "",
  referenceLinks: "",
  deadline: "",
  status: "Draft",
};

export function ScriptForm({
  initialValues,
  scriptId,
  lockClient,
  clientLabel,
}: {
  initialValues?: Partial<ScriptFormValues>;
  scriptId?: string;
  lockClient?: boolean;
  clientLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [clientId, setClientId] = useState(
    initialValues?.clientId ?? EMPTY.clientId,
  );
  const values = { ...EMPTY, ...initialValues };
  const isEdit = Boolean(scriptId);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const [clientRes, employeeRes, creatorRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/employees"),
        fetch("/api/creators"),
      ]);
      if (clientRes.ok) {
        const data = (await clientRes.json()) as { clients?: ClientOption[] };
        if (!cancelled) {
          setClients(data.clients ?? []);
        }
      }
      if (employeeRes.ok) {
        const data = (await employeeRes.json()) as { employees?: EmployeeOption[] };
        if (!cancelled) {
          setEmployees(data.employees ?? []);
        }
      }
      if (creatorRes.ok) {
        const data = (await creatorRes.json()) as { creators?: CreatorOption[] };
        if (!cancelled) {
          setCreators(data.creators ?? []);
        }
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOrders() {
      if (!clientId) {
        setOrders([]);
        return;
      }
      const response = await fetch(`/api/orders?clientId=${clientId}`);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { orders?: OrderOption[] };
      if (!cancelled) {
        setOrders(data.orders ?? []);
      }
    }

    void loadOrders();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      clientId: String(formData.get("clientId") ?? values.clientId),
      orderId: String(formData.get("orderId") ?? "") || null,
      videoNumber: Number(formData.get("videoNumber") ?? 1),
      writerId: String(formData.get("writerId") ?? "") || null,
      creatorId: String(formData.get("creatorId") ?? "") || null,
      language: String(formData.get("language") ?? ""),
      scriptText: String(formData.get("scriptText") ?? ""),
      referenceLinks: String(formData.get("referenceLinks") ?? "")
        .split(/\r?\n/)
        .map((link) => link.trim())
        .filter(Boolean),
      deadline: String(formData.get("deadline") ?? "") || null,
      status: String(formData.get("status") ?? "Draft"),
    };

    const response = await fetch(
      isEdit ? `/api/scripts/${scriptId}` : "/api/scripts",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
      script?: { id: string };
    };

    if (!response.ok) {
      const fieldError = data.details?.fieldErrors
        ? Object.values(data.details.fieldErrors).flat()[0]
        : null;
      setError(fieldError || data.error || "Could not save script.");
      setPending(false);
      return;
    }

    router.push(`/scripts/${data.script?.id ?? scriptId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Client</span>
          {lockClient ? (
            <>
              <input type="hidden" name="clientId" value={values.clientId} />
              <input
                readOnly
                value={
                  clientLabel ||
                  clients.find((client) => client.id === values.clientId)
                    ?.companyName ||
                  "Selected client"
                }
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white/80"
              />
            </>
          ) : (
            <select
              name="clientId"
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
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Order</span>
          <select
            name="orderId"
            defaultValue={values.orderId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">No package</option>
            {orders.map((order) => (
              <option key={order.id} value={order.id}>
                {order.packageName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Video #</span>
          <input
            name="videoNumber"
            type="number"
            min={1}
            defaultValue={values.videoNumber}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Language</span>
          <input
            name="language"
            defaultValue={values.language}
            placeholder="Hindi, English…"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Writer</span>
          <select
            name="writerId"
            defaultValue={values.writerId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name || employee.email}
                {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Creator</span>
          <select
            name="creatorId"
            defaultValue={values.creatorId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {creators.map((creator) => (
              <option key={creator.id} value={creator.id}>
                {creator.name}
                {creator.location ? ` · ${creator.location}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Deadline</span>
          <input
            name="deadline"
            type="date"
            defaultValue={values.deadline}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={normalizeScriptStatus(values.status)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {SCRIPT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SCRIPT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Script text</span>
        <textarea
          name="scriptText"
          rows={10}
          defaultValue={values.scriptText}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Reference links</span>
        <textarea
          name="referenceLinks"
          rows={4}
          defaultValue={values.referenceLinks}
          placeholder="One URL per line"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Save script" : "Create script"}
      </button>
    </form>
  );
}
