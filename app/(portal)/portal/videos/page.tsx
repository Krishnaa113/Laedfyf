import Link from "next/link";
import { loadVideoList } from "@/lib/videos/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { CLIENT_VISIBLE_VIDEO_STATUSES } from "@/lib/status";
import { VideoStatusBadge } from "@/components/status-badge";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return value.slice(0, 10);
}

export default async function PortalVideosPage() {
  const auth = await requirePortalAccess("videos", "read");
  const videos = (await loadVideoList(auth)).filter((video) =>
    CLIENT_VISIBLE_VIDEO_STATUSES.includes(video.status),
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Videos</h1>
        <p className="mt-1 text-sm text-white/60">
          Videos in client review, plus delivered cuts.
        </p>
      </div>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Package</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Revisions</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {videos.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No videos are waiting for you yet.
                </td>
              </tr>
            ) : (
              videos.map((video) => (
                <tr key={video.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/portal/videos/${video.id}`} className="hover:text-brand">
                      {video.packageName || video.companyName || "Video"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{formatDate(video.deadline)}</td>
                  <td className="px-4 py-3 text-white/70">{video.revisionCount}</td>
                  <td className="px-4 py-3">
                    <VideoStatusBadge status={video.status} />
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
