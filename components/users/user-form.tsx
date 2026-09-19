"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPLOYEE_SUB_ROLES,
  EMPLOYEE_SUB_ROLE_LABELS,
  PERMISSIONS,
  USER_ROLES,
} from "@/lib/roles";

export type UserFormValues = {
  name: string;
  email: string;
  role: string;
  employeeSubRole: string;
  permissions: string[];
  isActive: boolean;
};

export function UserForm({
  initialValues,
  userId,
}: {
  initialValues?: Partial<UserFormValues>;
  userId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(userId);
  const values: UserFormValues = {
    name: initialValues?.name ?? "",
    email: initialValues?.email ?? "",
    role: initialValues?.role ?? "admin",
    employeeSubRole: initialValues?.employeeSubRole ?? "sales",
    permissions: initialValues?.permissions ?? [],
    isActive: initialValues?.isActive ?? true,
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const permissions = form.getAll("permissions").map(String);
    const payload: Record<string, unknown> = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      role: String(form.get("role") ?? "admin"),
      employeeSubRole: String(form.get("employeeSubRole") ?? "") || null,
      permissions,
      isActive: form.get("isActive") === "on",
    };
    if (password) {
      payload.password = password;
    }

    setPending(true);
    setError(null);
    const response = await fetch(isEdit ? `/api/users/${userId}` : "/api/users", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data: { error?: string; user?: { id: string } } = {};
    try {
      data = (await response.json()) as { error?: string; user?: { id: string } };
    } catch {
      data = {};
    }
    if (!response.ok) {
      setError(data.error || "Could not save user.");
      setPending(false);
      return;
    }
    router.push("/users");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-white/10 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Name</span>
          <input
            name="name"
            defaultValue={values.name}
            required
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Email</span>
          <input
            name="email"
            type="email"
            defaultValue={values.email}
            required
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">{isEdit ? "New password (optional)" : "Password"}</span>
          <input
            name="password"
            type="password"
            required={!isEdit}
            minLength={isEdit ? undefined : 8}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Role</span>
          <select
            name="role"
            defaultValue={values.role}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {USER_ROLES.filter((role) => role !== "client").map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Employee sub-role</span>
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
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={values.isActive} className="accent-brand" />
          <span>Active</span>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm text-white/50">Permissions</legend>
        <p className="mt-1 text-xs text-white/40">
          Honored for admins. Owner always has everything. Leave unchecked and
          the role default is applied on create.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PERMISSIONS.map((permission) => (
            <label key={permission} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="permissions"
                value={permission}
                defaultChecked={values.permissions.includes(permission)}
                className="accent-brand"
              />
              <span>{permission}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : isEdit ? "Save user" : "Add user"}
      </button>
    </form>
  );
}
