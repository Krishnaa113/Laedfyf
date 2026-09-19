import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadVideoHub } from "@/lib/videos/hub";
import { requirePortalAccess } from "@/lib/page-auth";
import { CLIENT_VISIBLE_VIDEO_STATUSES } from "@/lib/status";
import { VideoStatusBadge } from "@/components/status-badge";
import { VideoReviewPanel } from "@/components/portal/video-review";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return value.slice(0, 10);
}

export default async function PortalVideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePortalAccess("videos", "read");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadVideoHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { video } = result.hub;
  if (!CLIENT_VISIBLE_VIDEO_STATUSES.includes(video.status)) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <Link href="/portal/videos" className="text-sm text-white/50 hover:text-brand">
          Back to videos
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {video.packageName || "Video"}
            {video.videoNumber ? ` · #${video.videoNumber}` : ""}
          </h1>
          <VideoStatusBadge status={video.status} />
        </div>
        <p className="mt-1 text-white/70">{video.companyName}</p>
      </div>

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Deadline" value={formatDate(video.deadline)} />
        <Info label="Revision count" value={String(video.revisionCount)} />
        <Info label="Creator" value={video.creatorName || "—"} />
      </section>

      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt=""
          className="max-h-80 rounded-lg border border-white/10 object-cover"
        />
      ) : null}

      {video.fileLink ? (
        <a
          href={video.fileLink}
          target="_blank"
          rel="noreferrer"
          className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
        >
          Open video file
        </a>
      ) : null}

      {video.finalDeliveryLink && video.status === "Delivered" ? (
        <a
          href={video.finalDeliveryLink}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-brand hover:underline"
        >
          Final delivery link
        </a>
      ) : null}

      <VideoReviewPanel video={video} />
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
