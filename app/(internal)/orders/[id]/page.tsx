import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { canAccess } from "@/lib/rbac";
import { loadOrderHub } from "@/lib/orders/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { OrderStatusBadge } from "@/components/status-badge";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderStatusPipeline } from "@/components/orders/status-pipeline";
import { ProductionCounter } from "@/components/orders/production-counter";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("orders", "read");
  const canWrite = pageCanWrite(auth, "orders");
  const canReadVideos = canAccess(auth.session.user, "videos", "read");
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const hub = await loadOrderHub(auth, id);
  if (!hub) {
    notFound();
  }

  const { order, videos } = hub;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/orders" className="text-sm text-white/50 hover:text-brand">
            Back to packages
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{order.packageName}</h1>
          <p className="mt-1 text-white/70">
            {order.clientId ? (
              <Link href={`/clients/${order.clientId}`} className="hover:text-brand">
                {order.companyName || order.clientName}
              </Link>
            ) : (
              order.companyName
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <OrderStatusBadge status={order.status} />
          {canWrite ? (
            <>
              <Link
                href={`/orders/${order.id}/edit`}
                className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
              >
                Edit package
              </Link>
              <DeleteOrderButton
                orderId={order.id}
                packageName={order.packageName}
              />
            </>
          ) : null}
        </div>
      </div>

      <OrderStatusPipeline
        orderId={order.id}
        status={order.status}
        canWrite={canWrite}
      />

      <ProductionCounter
        production={order.production}
        contractedVideoCount={order.contractedVideoCount}
      />

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Contracted videos" value={String(order.contractedVideoCount)} />
        <Info label="Pricing" value={formatMoney(order.pricing ?? 0)} />
        <Info label="GST / Tax" value={formatMoney(order.gstTax ?? 0)} />
        <Info label="Total invoice amount" value={formatMoney(order.totalInvoiceAmount ?? 0)} />
        <Info label="Amount received" value={formatMoney(order.amountReceived ?? 0)} />
        <Info label="Outstanding balance" value={formatMoney(order.outstandingBalance ?? 0)} />
        <Info label="Start date" value={formatDate(order.startDate)} />
        <Info label="Due date" value={formatDate(order.dueDate)} />
        <Info
          label="Assigned team"
          value={
            order.assignedTeam.length
              ? order.assignedTeam.map((member) => member.name || member.id).join(", ")
              : "—"
          }
        />
      </section>

      {canReadVideos ? (
        <section className="rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Videos in this package</h2>
            <div className="flex items-center gap-3">
              <p className="text-sm text-white/50">{videos.length}</p>
              {pageCanWrite(auth, "videos") ? (
                <Link
                  href={`/videos/new?clientId=${order.clientId ?? ""}&orderId=${order.id}`}
                  className="text-sm text-brand hover:underline"
                >
                  Add video
                </Link>
              ) : null}
            </div>
          </div>
          {videos.length === 0 ? (
            <p className="mt-3 text-sm text-white/50">
              No Video documents yet. Counters stay at zero until production starts.
            </p>
          ) : (
            <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Creator</th>
                    <th className="px-4 py-3 font-medium">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((video) => (
                    <tr key={video.id} className="border-t border-white/10">
                      <td className="px-4 py-3">
                        <Link href={`/videos/${video.id}`} className="hover:text-brand">
                          {video.status}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {video.creatorName || "—"}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {video.finalDeliveryLink || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
