import Link from "next/link";
import { loadEmployeeList } from "@/lib/employees/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { EMPLOYEE_SUB_ROLE_LABELS, type EmployeeSubRole } from "@/lib/roles";

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

export default async function EmployeesPage() {
  const auth = await requirePageAccess("employees", "read");
  const canWrite = pageCanWrite(auth, "employees");
  const employees = await loadEmployeeList({ includeCompensation: true });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Employees</h1>
          <p className="mt-1 text-sm text-white/60">
            Directory, compensation, and assigned production roles.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/employees/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Add employee
          </Link>
        ) : null}
      </div>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Salary</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  No employees yet.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr key={employee.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/employees/${employee.id}`} className="hover:text-brand">
                      {employee.name || employee.email}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">{employee.email}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {employee.employeeSubRole
                      ? EMPLOYEE_SUB_ROLE_LABELS[employee.employeeSubRole as EmployeeSubRole]
                      : employee.role}
                  </td>
                  <td className="px-4 py-3 text-white/70">{employee.jobTitle || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{formatMoney(employee.salary)}</td>
                  <td className="px-4 py-3 text-white/70">
                    {employee.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
