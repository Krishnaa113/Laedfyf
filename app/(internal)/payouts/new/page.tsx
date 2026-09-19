import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { PayoutForm } from "@/components/payouts/payout-form";

export default async function NewPayoutPage() {
  await requirePageAccess("payouts", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/payouts" className="text-sm text-white/50 hover:text-brand">
          Back to payouts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New creator payout</h1>
      </div>
      <PayoutForm />
    </main>
  );
}
