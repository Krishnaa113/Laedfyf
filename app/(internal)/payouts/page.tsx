import Link from "next/link";
import { loadPayoutList } from "@/lib/payouts/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { PAYOUT_STATUSES, PAYOUT_STATUS_LABELS } from "@/lib/status";
import { PayoutStatusBadge } from "@/components/status-badge";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const auth = await requirePageAccess("payouts", "read");
  const canWrite = pageCanWrite(auth, "payouts");
  const params = await searchParams;
  const payouts = await loadPayoutList(auth, { status: params.status || undefined });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Creator payouts</h1>
          <p className="mt-1 text-sm text-white/60">
            One payout per creator per video — duplicates are blocked.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/payouts/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            New payout
          </Link>
        ) : null}
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/payouts">
        <label className="flex w-56 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {PAYOUT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYOUT_STATUS_LABELS[status]}
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
              <th className="px-4 py-3 font-medium">Creator</th>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Videos</th>
              <th className="px-4 py-3 font-medium">Rate</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  No payouts yet.
                </td>
              </tr>
            ) : (
              payouts.map((payout) => (
                <tr key={payout.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/payouts/${payout.id}`} className="hover:text-brand">
                      {payout.creatorName || "Creator"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{payout.packageName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{payout.videoCount}</td>
                  <td className="px-4 py-3 text-white/70">
                    {formatMoney(payout.contractedRate)}
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatMoney(payout.totalPayout)}</td>
                  <td className="px-4 py-3">
                    <PayoutStatusBadge status={payout.status} />
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
