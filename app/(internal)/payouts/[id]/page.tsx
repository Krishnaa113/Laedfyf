import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadPayoutHub } from "@/lib/payouts/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { PayoutStatusBadge } from "@/components/status-badge";
import { PayoutStatusForm } from "@/components/payouts/payout-status-form";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("payouts", "read");
  const canWrite = pageCanWrite(auth, "payouts");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }
  const result = await loadPayoutHub(auth, id);
  if (!result.ok) {
    notFound();
  }
  const { payout } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div>
        <Link href="/payouts" className="text-sm text-white/50 hover:text-brand">
          Back to payouts
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{payout.creatorName || "Payout"}</h1>
          <PayoutStatusBadge status={payout.status} />
        </div>
        <p className="mt-1 text-white/70">{payout.packageName || "No linked package"}</p>
      </div>
      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Video count" value={String(payout.videoCount)} />
        <Info label="Contracted rate" value={formatMoney(payout.contractedRate)} />
        <Info label="Total payout" value={formatMoney(payout.totalPayout)} />
        <Info label="Payment date" value={payout.paymentDate?.slice(0, 10) || "—"} />
        <Info label="Reference" value={payout.reference || "—"} />
      </section>
      {canWrite ? <PayoutStatusForm payoutId={payout.id} status={payout.status} /> : null}
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
