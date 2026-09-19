"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  normalizeOrderStatus,
} from "@/lib/status";

export type OrderFormValues = {
  clientId: string;
  packageName: string;
  contractedVideoCount: number;
  pricing: number;
  gstTax: number;
  amountReceived: number;
  startDate: string;
  dueDate: string;
  assignedEmployeeIds: string[];
  status: string;
};

type ClientOption = { id: string; name: string; companyName: string };
type EmployeeOption = { id: string; name: string; email: string; jobTitle: string };

const EMPTY: OrderFormValues = {
  clientId: "",
  packageName: "",
  contractedVideoCount: 1,
  pricing: 0,
  gstTax: 0,
  amountReceived: 0,
  startDate: "",
  dueDate: "",
  assignedEmployeeIds: [],
  status: "New",
};

export function OrderForm({
  initialValues,
  orderId,
  lockClient,
  clientLabel,
}: {
  initialValues?: Partial<OrderFormValues>;
  orderId?: string;
  lockClient?: boolean;
  clientLabel?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [pricing, setPricing] = useState(initialValues?.pricing ?? 0);
  const [gstTax, setGstTax] = useState(initialValues?.gstTax ?? 0);
  const values = { ...EMPTY, ...initialValues };
  const isEdit = Boolean(orderId);
  const invoiceTotal = useMemo(() => Number(pricing) + Number(gstTax), [pricing, gstTax]);

  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      const [clientRes, employeeRes] = await Promise.all([
        fetch("/api/clients"),
        fetch("/api/employees"),
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
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const assigned = formData.getAll("assignedEmployeeIds").map(String);
    const payload = {
      clientId: String(formData.get("clientId") ?? values.clientId),
      packageName: String(formData.get("packageName") ?? ""),
      contractedVideoCount: Number(formData.get("contractedVideoCount") ?? 1),
      pricing: Number(formData.get("pricing") ?? 0),
      gstTax: Number(formData.get("gstTax") ?? 0),
      amountReceived: Number(formData.get("amountReceived") ?? 0),
      startDate: String(formData.get("startDate") ?? "") || null,
      dueDate: String(formData.get("dueDate") ?? "") || null,
      assignedEmployeeIds: assigned,
      status: String(formData.get("status") ?? "New"),
    };

    const response = await fetch(isEdit ? `/api/orders/${orderId}` : "/api/orders", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
      order?: { id: string };
    };

    setPending(false);

    if (!response.ok) {
      const fieldError = data.details?.fieldErrors
        ? Object.values(data.details.fieldErrors).flat()[0]
        : null;
      setError(fieldError || data.error || "Could not save package.");
      return;
    }

    router.push(`/orders/${data.order?.id ?? orderId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Client</span>
        {lockClient && values.clientId ? (
          <>
            <input type="hidden" name="clientId" value={values.clientId} />
            <p className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white/80">
              {clientLabel ||
                clients.find((client) => client.id === values.clientId)?.companyName ||
                "Selected client"}
            </p>
          </>
        ) : (
          <select
            name="clientId"
            required
            defaultValue={values.clientId}
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
      <Field
        label="Package name"
        name="packageName"
        defaultValue={values.packageName}
        required
      />
      <Field
        label="Contracted video count"
        name="contractedVideoCount"
        type="number"
        defaultValue={String(values.contractedVideoCount)}
        min="1"
        required
      />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Status</span>
        <select
          name="status"
          defaultValue={normalizeOrderStatus(values.status)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Pricing</span>
        <input
          name="pricing"
          type="number"
          min={0}
          step="0.01"
          defaultValue={values.pricing}
          onChange={(event) => setPricing(Number(event.target.value) || 0)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">GST / Tax</span>
        <input
          name="gstTax"
          type="number"
          min={0}
          step="0.01"
          defaultValue={values.gstTax}
          onChange={(event) => setGstTax(Number(event.target.value) || 0)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <div>
        <p className="text-sm text-white/70">Total invoice amount</p>
        <p className="mt-2 text-lg font-medium text-brand">
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          }).format(invoiceTotal)}
        </p>
        <p className="mt-1 text-xs text-white/40">Pricing + GST, stored on save</p>
      </div>
      <Field
        label="Amount received"
        name="amountReceived"
        type="number"
        defaultValue={String(values.amountReceived)}
        min="0"
      />
      <Field
        label="Start date"
        name="startDate"
        type="date"
        defaultValue={values.startDate}
      />
      <Field
        label="Due date"
        name="dueDate"
        type="date"
        defaultValue={values.dueDate}
      />
      <fieldset className="md:col-span-2 rounded-lg border border-white/10 p-4">
        <legend className="px-1 text-sm text-white/70">Assigned team</legend>
        {employees.length === 0 ? (
          <p className="text-sm text-white/50">No employees available to assign.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {employees.map((employee) => (
              <label key={employee.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="assignedEmployeeIds"
                  value={employee.id}
                  defaultChecked={values.assignedEmployeeIds.includes(employee.id)}
                  className="accent-brand"
                />
                <span>
                  {employee.name || employee.jobTitle || employee.email}
                  {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      {error ? <p className="md:col-span-2 text-sm text-red-400">{error}</p> : null}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-charcoal disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save package" : "Create package"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  min,
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
  min?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        defaultValue={defaultValue}
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
      />
    </label>
  );
}
