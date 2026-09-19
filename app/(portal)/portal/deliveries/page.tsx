import Link from "next/link";
import { loadVideoList } from "@/lib/videos/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { formatPortalDate } from "@/lib/portal/format";
import { VideoStatusBadge } from "@/components/status-badge";

export default async function PortalDeliveriesPage() {
  const auth = await requirePortalAccess("videos", "read");
  const videos = (await loadVideoList(auth)).filter(
    (video) => video.status === "Delivered" && video.finalDeliveryLink,
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Deliveries</h1>
        <p className="mt-1 text-sm text-white/60">
          Final approved cuts for your account.
        </p>
      </div>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Delivered</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No final deliveries yet.
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/portal/videos/${video.id}`} className="hover:text-brand">
                      {video.packageName || "Video"}
                      {video.videoNumber ? ` · #${video.videoNumber}` : ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatPortalDate(video.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <VideoStatusBadge status={video.status} />
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={video.finalDeliveryLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand hover:underline"
                    >
                      Open delivery
                    </a>
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
