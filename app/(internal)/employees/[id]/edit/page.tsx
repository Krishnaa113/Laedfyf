import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadEmployeeHub } from "@/lib/employees/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { EmployeeForm } from "@/components/employees/employee-form";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("employees", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const employee = await loadEmployeeHub(id, { includeCompensation: true });
  if (!employee) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href={`/employees/${employee.id}`} className="text-sm text-white/50 hover:text-brand">
          Back to employee
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit employee</h1>
      </div>
      <EmployeeForm
        employeeId={employee.id}
        canSetPassword={auth.session.user.role === "owner"}
        initialValues={{
          name: employee.name,
          email: employee.email,
          employeeSubRole: employee.employeeSubRole ?? "sales",
          jobTitle: employee.jobTitle,
          department: employee.department,
          salary: employee.salary ?? 0,
          joiningDate: employee.joiningDate ? employee.joiningDate.slice(0, 10) : "",
          phone: employee.phone,
          isActive: employee.isActive,
        }}
      />
    </main>
  );
}
