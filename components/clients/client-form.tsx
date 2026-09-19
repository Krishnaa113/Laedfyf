"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput, RevealPassword } from "@/components/clients/reveal-password";
import {
  ASSET_KINDS,
  CLIENT_STATUSES,
  CLIENT_STATUS_LABELS,
  normalizeClientStatus,
  type AssetKind,
} from "@/lib/status";

export type ClientFormValues = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  whatsapp: string;
  brandName: string;
  industry: string;
  gstTaxId: string;
  assignedEmployeeId: string;
  source: string;
  status: string;
  notes: string;
};

type EmployeeOption = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
};

type AssetDraft = {
  name: string;
  url: string;
  kind: AssetKind;
};

const EMPTY_VALUES: ClientFormValues = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  whatsapp: "",
  brandName: "",
  industry: "",
  gstTaxId: "",
  assignedEmployeeId: "",
  source: "",
  status: "Lead",
  notes: "",
};

export function ClientForm({
  initialValues,
  clientId,
  canRevealPassword = false,
  currentPassword = null,
}: {
  initialValues?: Partial<ClientFormValues>;
  clientId?: string;
  canRevealPassword?: boolean;
  currentPassword?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [assets, setAssets] = useState<AssetDraft[]>([
    { name: "", url: "", kind: "Brand Kit" },
  ]);
  const values = { ...EMPTY_VALUES, ...initialValues };
  const isEdit = Boolean(clientId);

  useEffect(() => {
    let cancelled = false;

    async function loadEmployees() {
      const response = await fetch("/api/employees");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { employees?: EmployeeOption[] };
      if (!cancelled) {
        setEmployees(data.employees ?? []);
      }
    }

    void loadEmployees();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = {
      name: String(formData.get("name") ?? ""),
      companyName: String(formData.get("companyName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? ""),
      brandName: String(formData.get("brandName") ?? ""),
      industry: String(formData.get("industry") ?? ""),
      gstTaxId: String(formData.get("gstTaxId") ?? ""),
      assignedEmployeeId: String(formData.get("assignedEmployeeId") ?? "") || null,
      source: String(formData.get("source") ?? ""),
      status: String(formData.get("status") ?? "Lead"),
      notes: String(formData.get("notes") ?? ""),
    };

    const password = String(formData.get("password") ?? "");
    if (!isEdit || password) {
      payload.password = password;
    }

    if (!isEdit) {
      payload.assets = assets.filter((asset) => asset.url.trim());
    }

    const response = await fetch(
      isEdit ? `/api/clients/${clientId}` : "/api/clients",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = (await response.json()) as {
      error?: string;
      details?: { fieldErrors?: Record<string, string[]> };
      client?: { id: string };
    };

    setPending(false);

    if (!response.ok) {
      const fieldError = data.details?.fieldErrors
        ? Object.values(data.details.fieldErrors).flat()[0]
        : null;
      setError(fieldError || data.error || "Could not save client.");
      return;
    }

    router.push(`/clients/${data.client?.id ?? clientId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <Field label="Client name" name="name" defaultValue={values.name} required />
      <Field
        label="Company name"
        name="companyName"
        defaultValue={values.companyName}
        required
      />
      {canRevealPassword && isEdit ? (
        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/70">Current portal password</span>
          <RevealPassword value={currentPassword} />
        </div>
      ) : null}
      {canRevealPassword || !isEdit ? (
        <PasswordInput
          name="password"
          label={isEdit ? "New portal password" : "Portal password"}
          required={!isEdit}
          hint={
            isEdit
              ? "Leave blank to keep the current password. No OTP required."
              : "The client signs in with their client name and this password."
          }
        />
      ) : null}
      <Field
        label="Email"
        name="email"
        type="email"
        defaultValue={values.email}
        required
      />
      <Field label="Phone" name="phone" defaultValue={values.phone} />
      <Field label="WhatsApp" name="whatsapp" defaultValue={values.whatsapp} />
      <Field
        label="Business / brand name"
        name="brandName"
        defaultValue={values.brandName}
      />
      <Field label="Industry" name="industry" defaultValue={values.industry} />
      <Field label="GST / Tax ID" name="gstTaxId" defaultValue={values.gstTaxId} />
      <Field label="Source" name="source" defaultValue={values.source} />
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Assigned employee</span>
        <select
          name="assignedEmployeeId"
          defaultValue={values.assignedEmployeeId}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          <option value="">Unassigned</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name || employee.jobTitle || employee.email}
              {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Status</span>
        <select
          name="status"
          defaultValue={normalizeClientStatus(values.status)}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          {CLIENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {CLIENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="md:col-span-2 flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Notes</span>
        <textarea
          name="notes"
          rows={4}
          defaultValue={values.notes}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      {!isEdit ? (
        <fieldset className="md:col-span-2 rounded-lg border border-white/10 p-4">
          <legend className="px-1 text-sm text-white/70">Assets</legend>
          <div className="space-y-3">
            {assets.map((asset, index) => (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_1fr_160px]">
                <input
                  value={asset.name}
                  onChange={(event) => {
                    const next = [...assets];
                    next[index] = { ...next[index], name: event.target.value };
                    setAssets(next);
                  }}
                  placeholder="Asset name"
                  className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
                />
                <input
                  value={asset.url}
                  onChange={(event) => {
                    const next = [...assets];
                    next[index] = { ...next[index], url: event.target.value };
                    setAssets(next);
                  }}
                  placeholder="https://…"
                  className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
                />
                <select
                  value={asset.kind}
                  onChange={(event) => {
                    const next = [...assets];
                    next[index] = {
                      ...next[index],
                      kind: event.target.value as AssetKind,
                    };
                    setAssets(next);
                  }}
                  className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
                >
                  {ASSET_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setAssets([...assets, { name: "", url: "", kind: "Other" }])
            }
            className="mt-3 text-sm text-brand hover:underline"
          >
            Add another asset
          </button>
        </fieldset>
      ) : null}
      {error ? (
        <p className="md:col-span-2 text-sm text-red-400">{error}</p>
      ) : null}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-charcoal disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save client" : "Add client"}
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
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
      />
    </label>
  );
}
