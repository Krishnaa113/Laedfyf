import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { EmployeeForm } from "@/components/employees/employee-form";

export default async function NewEmployeePage() {
  await requirePageAccess("employees", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/employees" className="text-sm text-white/50 hover:text-brand">
          Back to employees
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add employee</h1>
        <p className="mt-1 text-sm text-white/60">
          Creates a staff login and a directory record in one step.
        </p>
      </div>
      <EmployeeForm />
    </main>
  );
}
