import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { ExpenseForm } from "@/components/expenses/expense-form";

export default async function NewExpensePage() {
  await requirePageAccess("expenses", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/expenses" className="text-sm text-white/50 hover:text-brand">
          Back to expenses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New expense</h1>
      </div>
      <ExpenseForm />
    </main>
  );
}
