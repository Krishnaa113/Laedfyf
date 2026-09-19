import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadOrderHub } from "@/lib/orders/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { OrderForm } from "@/components/orders/order-form";

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("orders", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const hub = await loadOrderHub(auth, id);
  if (!hub) {
    notFound();
  }

  const { order } = hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/orders/${order.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to package
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit package</h1>
        <p className="mt-1 text-sm text-white/60">{order.companyName}</p>
      </div>
      <OrderForm
        orderId={order.id}
        lockClient
        clientLabel={order.companyName || order.clientName}
        initialValues={{
          clientId: order.clientId ?? "",
          packageName: order.packageName,
          contractedVideoCount: order.contractedVideoCount,
          pricing: order.pricing ?? 0,
          gstTax: order.gstTax ?? 0,
          amountReceived: order.amountReceived ?? 0,
          startDate: toDateInput(order.startDate),
          dueDate: toDateInput(order.dueDate),
          assignedEmployeeIds: order.assignedEmployeeIds,
          status: order.status,
        }}
      />
    </main>
  );
}
