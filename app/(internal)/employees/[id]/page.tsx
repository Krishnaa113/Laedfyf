import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadEmployeeHub } from "@/lib/employees/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { EMPLOYEE_SUB_ROLE_LABELS, type EmployeeSubRole } from "@/lib/roles";
import { SetPasswordForm } from "@/components/account/set-password-form";

function formatMoney(value: number | null) {
  if (value == null) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("employees", "read");
  const canWrite = pageCanWrite(auth, "employees");
  const canSetPassword = auth.session.user.role === "owner";
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const employee = await loadEmployeeHub(id, { includeCompensation: true });
  if (!employee) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/employees" className="text-sm text-white/50 hover:text-brand">
            Back to employees
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{employee.name || employee.email}</h1>
          <p className="mt-1 text-white/70">{employee.jobTitle || "No title"}</p>
        </div>
        {canWrite ? (
          <Link
            href={`/employees/${employee.id}/edit`}
            className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
          >
            Edit employee
          </Link>
        ) : null}
      </div>
      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Email" value={employee.email} />
        <Info label="Phone" value={employee.phone || "—"} />
        <Info
          label="Sub-role"
          value={
            employee.employeeSubRole
              ? EMPLOYEE_SUB_ROLE_LABELS[employee.employeeSubRole as EmployeeSubRole]
              : "—"
          }
        />
        <Info label="Department" value={employee.department || "—"} />
        <Info label="Salary" value={formatMoney(employee.salary)} />
        <Info label="Joined" value={employee.joiningDate?.slice(0, 10) || "—"} />
        <Info label="Status" value={employee.isActive ? "Active" : "Inactive"} />
      </section>
      {canSetPassword ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Login password</h2>
          <p className="mt-1 text-sm text-white/60">
            Owner can replace this immediately. No OTP, email, or current
            password is required. Staff sign in on /login with email + this
            password.
          </p>
          <div className="mt-6">
            <SetPasswordForm endpoint={`/api/employees/${employee.id}`} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
