"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRE_SHOOT_CHECKLIST_ITEMS,
  emptyPreShootChecklist,
  type PreShootChecklist,
} from "@/lib/shoots/checklist";
import {
  SHOOT_STATUSES,
  SHOOT_STATUS_LABELS,
  normalizeShootStatus,
} from "@/lib/status";

export type ShootFormValues = {
  clientId: string;
  orderId: string;
  creatorId: string;
  cameramanId: string;
  shootManagerId: string;
  assistantId: string;
  approvedScriptIds: string[];
  location: string;
  scheduledAt: string;
  endsAt: string;
  status: string;
  notes: string;
  checklist: PreShootChecklist;
};

type ClientOption = { id: string; name: string; companyName: string };
type OrderOption = { id: string; packageName: string; clientId: string | null };
type CreatorOption = {
  id: string;
  name: string;
  location: string;
  availability: string;
};
type EmployeeOption = { id: string; name: string; email: string; jobTitle: string };
type ScriptOption = {
  id: string;
  videoNumber: number;
  status: string;
  language: string;
};

const EMPTY: ShootFormValues = {
  clientId: "",
  orderId: "",
  creatorId: "",
  cameramanId: "",
  shootManagerId: "",
  assistantId: "",
  approvedScriptIds: [],
  location: "",
  scheduledAt: "",
  endsAt: "",
  status: "Scheduled",
  notes: "",
  checklist: emptyPreShootChecklist(),
};

const APPROVED_SCRIPT_STATUSES = new Set(["Approved", "Ready for Shoot"]);

export function ShootForm({
  initialValues,
  shootId,
  lockCreator,
  creatorLabel,
}: {
  initialValues?: Partial<ShootFormValues>;
  shootId?: string;
  lockCreator?: boolean;
  creatorLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [creators, setCreators] = useState<CreatorOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [scripts, setScripts] = useState<ScriptOption[]>([]);
  const [clientId, setClientId] = useState(
    initialValues?.clientId ?? EMPTY.clientId,
  );
  const values = {
    ...EMPTY,
    ...initialValues,
    checklist: {
      ...EMPTY.checklist,
      ...initialValues?.checklist,
    },
    approvedScriptIds: initialValues?.approvedScriptIds ?? EMPTY.approvedScriptIds,
  };
  const isEdit = Boolean(shootId);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const [clientRes, creatorRes, employeeRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/creators"),
        fetch("/api/employees"),
      ]);
      if (clientRes.ok) {
        const data = (await clientRes.json()) as { clients?: ClientOption[] };
        if (!cancelled) {
          setClients(data.clients ?? []);
        }
      }
      if (creatorRes.ok) {
        const data = (await creatorRes.json()) as { creators?: CreatorOption[] };
        if (!cancelled) {
          setCreators(data.creators ?? []);
        }
      }
      if (employeeRes.ok) {
        const data = (await employeeRes.json()) as { employees?: EmployeeOption[] };
        if (!cancelled) {
          setEmployees(data.employees ?? []);
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

    async function loadClientRecords() {
      if (!clientId) {
        setOrders([]);
        setScripts([]);
        return;
      }
      const [orderRes, scriptRes] = await Promise.all([
        fetch(`/api/orders?clientId=${clientId}`),
        fetch(`/api/scripts?clientId=${clientId}`),
      ]);
      if (orderRes.ok) {
        const data = (await orderRes.json()) as { orders?: OrderOption[] };
        if (!cancelled) {
          setOrders(data.orders ?? []);
        }
      }
      if (scriptRes.ok) {
        const data = (await scriptRes.json()) as { scripts?: ScriptOption[] };
        if (!cancelled) {
          setScripts(data.scripts ?? []);
        }
      }
    }

    void loadClientRecords();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const scriptOptions = useMemo(() => {
    const selected = new Set(values.approvedScriptIds);
    return scripts.filter(
      (script) =>
        APPROVED_SCRIPT_STATUSES.has(script.status) || selected.has(script.id),
    );
  }, [scripts, values.approvedScriptIds]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const checklist = emptyPreShootChecklist();
    for (const item of PRE_SHOOT_CHECKLIST_ITEMS) {
      checklist[item.key] = formData.get(`checklist.${item.key}`) === "on";
    }

    const payload = {
      clientId: String(formData.get("clientId") ?? values.clientId),
      orderId: String(formData.get("orderId") ?? "") || null,
      creatorId: String(formData.get("creatorId") ?? values.creatorId) || null,
      cameramanId: String(formData.get("cameramanId") ?? "") || null,
      shootManagerId: String(formData.get("shootManagerId") ?? "") || null,
      assistantId: String(formData.get("assistantId") ?? "") || null,
      approvedScriptIds: formData.getAll("approvedScriptIds").map(String),
      location: String(formData.get("location") ?? ""),
      scheduledAt: String(formData.get("scheduledAt") ?? "") || null,
      endsAt: String(formData.get("endsAt") ?? "") || null,
      status: String(formData.get("status") ?? "Scheduled"),
      notes: String(formData.get("notes") ?? ""),
      checklist,
    };

    const response = await fetch(
      isEdit ? `/api/shoots/${shootId}` : "/api/shoots",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
      shoot?: { id: string };
    };

    if (!response.ok) {
      const fieldError = data.details?.fieldErrors
        ? Object.values(data.details.fieldErrors).flat()[0]
        : null;
      setError(fieldError || data.error || "Could not save shoot.");
      setPending(false);
      return;
    }

    router.push(`/shoots/${data.shoot?.id ?? shootId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Client</span>
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
          <span className="text-white/50">Creator</span>
          {lockCreator ? (
            <>
              <input type="hidden" name="creatorId" value={values.creatorId} />
              <input
                readOnly
                value={
                  creatorLabel ||
                  creators.find((creator) => creator.id === values.creatorId)?.name ||
                  "Selected creator"
                }
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-white/80"
              />
            </>
          ) : (
            <select
              name="creatorId"
              defaultValue={values.creatorId}
              className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
            >
              <option value="">Unassigned</option>
              {creators.map((creator) => (
                <option key={creator.id} value={creator.id}>
                  {creator.name}
                  {creator.availability ? ` · ${creator.availability}` : ""}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Location</span>
          <input
            name="location"
            defaultValue={values.location}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Date / time</span>
          <input
            name="scheduledAt"
            type="datetime-local"
            defaultValue={values.scheduledAt}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Ends</span>
          <input
            name="endsAt"
            type="datetime-local"
            defaultValue={values.endsAt}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Cameraman</span>
          <select
            name="cameramanId"
            defaultValue={values.cameramanId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name || employee.jobTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Shoot manager</span>
          <select
            name="shootManagerId"
            defaultValue={values.shootManagerId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name || employee.jobTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Shooting assistant</span>
          <select
            name="assistantId"
            defaultValue={values.assistantId}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name || employee.jobTitle}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={normalizeShootStatus(values.status)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {SHOOT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {SHOOT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="rounded-lg border border-white/10 p-4">
        <legend className="px-1 text-sm text-white/60">Approved scripts</legend>
        {scriptOptions.length === 0 ? (
          <p className="text-sm text-white/50">
            {clientId
              ? "No approved scripts for this client."
              : "Select a client to attach approved scripts."}
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {scriptOptions.map((script) => (
              <label key={script.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="approvedScriptIds"
                  value={script.id}
                  defaultChecked={values.approvedScriptIds.includes(script.id)}
                  className="accent-brand"
                />
                <span>
                  Video {script.videoNumber}
                  {script.language ? ` · ${script.language}` : ""} · {script.status}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-white/10 p-4">
        <legend className="px-1 text-sm text-white/60">Pre-shoot checklist</legend>
        <p className="mb-3 text-xs text-white/40">
          All items must be checked before the shoot can move to In Progress.
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {PRE_SHOOT_CHECKLIST_ITEMS.map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`checklist.${item.key}`}
                defaultChecked={values.checklist[item.key]}
                className="accent-brand"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={values.notes}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Save shoot" : "Book shoot"}
      </button>
    </form>
  );
}
