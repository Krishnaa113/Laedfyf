import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadOrderHub } from "@/lib/orders/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { formatPortalDate } from "@/lib/portal/format";
import { OrderStatusBadge, VideoStatusBadge } from "@/components/status-badge";

export default async function PortalOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePortalAccess("orders", "read");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const hub = await loadOrderHub(auth, id);
  if (!hub) {
    notFound();
  }

  const { order, videos } = hub;
  const deliveries = videos.filter(
    (video) => video.status === "Delivered" && video.finalDeliveryLink,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <Link href="/portal/orders" className="text-sm text-white/50 hover:text-brand">
          Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{order.packageName}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="mt-1 text-white/70">{order.companyName}</p>
      </div>

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-4">
        <Info label="Contracted" value={String(order.contractedVideoCount)} />
        <Info label="In production" value={String(order.production.assigned)} />
        <Info label="Delivered" value={String(order.production.delivered)} />
        <Info label="Remaining" value={String(order.production.remaining)} />
        <Info label="Start" value={formatPortalDate(order.startDate)} />
        <Info label="Due" value={formatPortalDate(order.dueDate)} />
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium">Production</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Video</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-white/50">
                  No videos on this package yet.
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/portal/videos/${video.id}`} className="hover:text-brand">
                      {video.videoNumber ? `#${video.videoNumber}` : "Video"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <VideoStatusBadge status={video.status} />
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalDate(video.deadline)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {deliveries.length > 0 ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Final delivery links</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {deliveries.map((video) => (
              <li key={video.id}>
                <a
                  href={video.finalDeliveryLink}
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {video.videoNumber ? `Video #${video.videoNumber}` : "Final cut"}
                </a>
              </li>
            ))}
          </ul>
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
