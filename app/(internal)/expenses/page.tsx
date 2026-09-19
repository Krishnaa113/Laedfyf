import Link from "next/link";
import { loadExpenseList } from "@/lib/expenses/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/status";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const auth = await requirePageAccess("expenses", "read");
  const canWrite = pageCanWrite(auth, "expenses");
  const params = await searchParams;
  const expenses = await loadExpenseList(auth, {
    category: params.category || undefined,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="mt-1 text-sm text-white/60">Operating costs with receipt uploads.</p>
        </div>
        {canWrite ? (
          <Link
            href="/expenses/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            New expense
          </Link>
        ) : null}
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/expenses">
        <label className="flex w-56 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Category</span>
          <select
            name="category"
            defaultValue={params.category ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {EXPENSE_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
        >
          Filter
        </button>
      </form>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Logged by</th>
              <th className="px-4 py-3 font-medium">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/50">
                  No expenses yet.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr key={expense.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white/70">
                    {expense.date ? expense.date.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3">{expense.category}</td>
                  <td className="px-4 py-3 text-white/70">{formatMoney(expense.amount)}</td>
                  <td className="px-4 py-3 text-white/70">{expense.userName || "—"}</td>
                  <td className="px-4 py-3">
                    {expense.receiptUrl ? (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        Open
                      </a>
                    ) : (
                      "—"
                    )}
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
