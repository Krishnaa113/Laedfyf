import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadVideoHub } from "@/lib/videos/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { VideoStatusBadge } from "@/components/status-badge";
import { DeleteVideoButton } from "@/components/videos/delete-video-button";
import { VideoFeedbackLog } from "@/components/videos/feedback-log";
import { VideoStatusPipeline } from "@/components/videos/status-pipeline";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return value.slice(0, 16).replace("T", " ");
}

export default async function VideoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("videos", "read");
  const canWrite = pageCanWrite(auth, "videos");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadVideoHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { video } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/videos" className="text-sm text-white/50 hover:text-brand">
            Back to videos
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {video.packageName || "Video"}
            {video.videoNumber ? ` · #${video.videoNumber}` : ""}
          </h1>
          <p className="mt-1 text-white/70">
            {video.clientId ? (
              <Link href={`/clients/${video.clientId}`} className="hover:text-brand">
                {video.companyName}
              </Link>
            ) : (
              video.companyName
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VideoStatusBadge status={video.status} />
          {canWrite ? (
            <>
              <Link
                href={`/videos/${video.id}/edit`}
                className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
              >
                Edit video
              </Link>
              <DeleteVideoButton
                videoId={video.id}
                label={video.packageName || video.companyName || "video"}
              />
            </>
          ) : null}
        </div>
      </div>

      <VideoStatusPipeline
        videoId={video.id}
        status={video.status}
        canWrite={canWrite}
      />

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info
          label="Order"
          value={
            video.orderId ? (
              <Link href={`/orders/${video.orderId}`} className="hover:text-brand">
                {video.packageName || "Order"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info
          label="Script"
          value={
            video.scriptId ? (
              <Link href={`/scripts/${video.scriptId}`} className="hover:text-brand">
                {video.videoNumber ? `Video #${video.videoNumber}` : "Script"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info
          label="Creator"
          value={
            video.creatorId ? (
              <Link href={`/creators/${video.creatorId}`} className="hover:text-brand">
                {video.creatorName || "Creator"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info
          label="Shoot"
          value={
            video.shootId ? (
              <Link href={`/shoots/${video.shootId}`} className="hover:text-brand">
                {video.shootLocation || "Shoot"}
              </Link>
            ) : (
              "—"
            )
          }
        />
        <Info label="Assigned editor" value={video.assignedEditorName || "—"} />
        <Info label="Deadline" value={formatDate(video.deadline)} />
        <Info label="Revision count" value={String(video.revisionCount)} />
        <Info
          label="Video file"
          value={
            video.fileLink ? (
              <a href={video.fileLink} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                Open file
              </a>
            ) : (
              "—"
            )
          }
        />
        <Info
          label="Thumbnail"
          value={
            video.thumbnailUrl ? (
              <a href={video.thumbnailUrl} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                Open thumbnail
              </a>
            ) : (
              "—"
            )
          }
        />
        <Info
          label="Final delivery"
          value={
            video.finalDeliveryLink ? (
              <a href={video.finalDeliveryLink} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                Open delivery
              </a>
            ) : (
              "—"
            )
          }
        />
      </section>

      {video.thumbnailUrl ? (
        <img
          src={video.thumbnailUrl}
          alt=""
          className="max-h-64 rounded-lg border border-white/10 object-cover"
        />
      ) : null}

      <VideoFeedbackLog
        videoId={video.id}
        entries={video.feedbackLog}
        canComment={canWrite}
      />
    </main>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}
