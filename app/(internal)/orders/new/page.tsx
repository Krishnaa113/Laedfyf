import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePageAccess("orders", "write");
  const { clientId } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/orders" className="text-sm text-white/50 hover:text-brand">
          Back to packages
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add package</h1>
        <p className="mt-1 text-sm text-white/60">
          Production counters stay live from Video documents after save.
        </p>
      </div>
      <OrderForm
        lockClient={Boolean(clientId)}
        initialValues={clientId ? { clientId } : undefined}
      />
    </main>
  );
}
