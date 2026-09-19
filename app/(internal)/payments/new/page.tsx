import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { PaymentForm } from "@/components/payments/payment-form";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; orderId?: string }>;
}) {
  await requirePageAccess("payments", "write");
  const params = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/payments" className="text-sm text-white/50 hover:text-brand">
          Back to payments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New invoice</h1>
      </div>
      <PaymentForm
        initialValues={{
          clientId: params.clientId,
          orderId: params.orderId,
        }}
      />
    </main>
  );
}
