import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadVideoHub } from "@/lib/videos/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { VideoForm } from "@/components/videos/video-form";

function toDateTimeInput(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("videos", "write");
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/videos/${video.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to video
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit video</h1>
        <p className="mt-1 text-sm text-white/60">{video.companyName}</p>
      </div>
      <VideoForm
        videoId={video.id}
        initialValues={{
          clientId: video.clientId ?? "",
          orderId: video.orderId ?? "",
          scriptId: video.scriptId ?? "",
          creatorId: video.creatorId ?? "",
          shootId: video.shootId ?? "",
          assignedEditorId: video.assignedEditorId ?? "",
          deadline: toDateTimeInput(video.deadline),
          fileLink: video.fileLink,
          thumbnailUrl: video.thumbnailUrl,
          finalDeliveryLink: video.finalDeliveryLink,
          status: video.status,
        }}
      />
    </main>
  );
}
