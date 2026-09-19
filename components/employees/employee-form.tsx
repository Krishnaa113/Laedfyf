"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EMPLOYEE_SUB_ROLES, EMPLOYEE_SUB_ROLE_LABELS } from "@/lib/roles";

export type EmployeeFormValues = {
  name: string;
  email: string;
  employeeSubRole: string;
  jobTitle: string;
  department: string;
  salary: number;
  joiningDate: string;
  phone: string;
  isActive: boolean;
};

const EMPTY: EmployeeFormValues = {
  name: "",
  email: "",
  employeeSubRole: "sales",
  jobTitle: "",
  department: "",
  salary: 0,
  joiningDate: "",
  phone: "",
  isActive: true,
};

export function EmployeeForm({
  initialValues,
  employeeId,
  canSetPassword = true,
}: {
  initialValues?: Partial<EmployeeFormValues>;
  employeeId?: string;
  canSetPassword?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const values = { ...EMPTY, ...initialValues };
  const isEdit = Boolean(employeeId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const payload: Record<string, unknown> = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      employeeSubRole: String(form.get("employeeSubRole") ?? "sales"),
      jobTitle: String(form.get("jobTitle") ?? ""),
      department: String(form.get("department") ?? ""),
      salary: Number(form.get("salary") ?? 0),
      joiningDate: String(form.get("joiningDate") ?? "") || null,
      phone: String(form.get("phone") ?? ""),
      isActive: form.get("isActive") === "on",
    };
    if (password) {
      payload.password = password;
    }

    setPending(true);
    setError(null);
    const response = await fetch(
      isEdit ? `/api/employees/${employeeId}` : "/api/employees",
      {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    let data: { error?: string; employee?: { id: string } } = {};
    try {
      data = (await response.json()) as { error?: string; employee?: { id: string } };
    } catch {
      data = {};
    }
    if (!response.ok) {
      setError(data.error || "Could not save employee.");
      setPending(false);
      return;
    }
    router.push(`/employees/${data.employee?.id ?? employeeId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-2">
      <Field label="Name" name="name" defaultValue={values.name} required />
      <Field label="Email" name="email" type="email" defaultValue={values.email} required />
      {canSetPassword ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">{isEdit ? "New password (optional)" : "Password"}</span>
          <input
            name="password"
            type="password"
            minLength={isEdit ? undefined : 8}
            required={!isEdit}
            autoComplete="new-password"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
          {isEdit ? (
            <span className="text-xs text-white/45">
              Leave blank to keep the current password. No OTP required.
            </span>
          ) : null}
        </label>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Sub-role</span>
        <select
          name="employeeSubRole"
          defaultValue={values.employeeSubRole}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        >
          {EMPLOYEE_SUB_ROLES.map((role) => (
            <option key={role} value={role}>
              {EMPLOYEE_SUB_ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>
      <Field label="Job title" name="jobTitle" defaultValue={values.jobTitle} />
      <Field label="Department" name="department" defaultValue={values.department} />
      <Field label="Salary" name="salary" type="number" defaultValue={String(values.salary)} />
      <Field label="Joining date" name="joiningDate" type="date" defaultValue={values.joiningDate} />
      <Field label="Phone" name="phone" defaultValue={values.phone} />
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input name="isActive" type="checkbox" defaultChecked={values.isActive} className="accent-brand" />
        <span>Active</span>
      </label>
      {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save employee" : "Add employee"}
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
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-white/50">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
      />
    </label>
  );
}
