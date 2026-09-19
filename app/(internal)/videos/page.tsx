import Link from "next/link";
import {
  editorEmployeeIdForUser,
  loadVideoList,
} from "@/lib/videos/hub";
import { groupEditorDashboard } from "@/lib/videos/dashboard";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import type { SerializedVideo } from "@/lib/serialize";
import { VideoStatusBadge } from "@/components/status-badge";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return value.slice(0, 16).replace("T", " ");
}

function Bucket({
  title,
  videos,
  empty,
}: {
  title: string;
  videos: SerializedVideo[];
  empty: string;
}) {
  return (
    <section className="rounded-lg border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <span className="text-xs text-white/40">{videos.length}</span>
      </div>
      {videos.length === 0 ? (
        <p className="px-4 py-6 text-sm text-white/50">{empty}</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {videos.map((video) => (
            <li key={video.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={`/videos/${video.id}`} className="text-sm hover:text-brand">
                  {video.companyName || "Video"}
                  {video.packageName ? ` · ${video.packageName}` : ""}
                </Link>
                <p className="mt-1 text-xs text-white/50">
                  {video.assignedEditorName || "Unassigned editor"} · deadline{" "}
                  {formatDate(video.deadline)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {video.revisionPriority ? (
                  <span className="inline-flex rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-300">
                    Priority
                  </span>
                ) : null}
                <VideoStatusBadge status={video.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function VideosPage() {
  const auth = await requirePageAccess("videos", "read");
  const canWrite = pageCanWrite(auth, "videos");
  const isEditor = auth.session.user.employeeSubRole === "editor";
  const editorId = isEditor
    ? await editorEmployeeIdForUser(auth.session.user.id)
    : null;

  const videos = await loadVideoList(auth, {
    editorId: editorId || undefined,
  });
  const buckets = groupEditorDashboard(videos);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Editor dashboard</h1>
          <p className="mt-1 text-sm text-white/60">
            {isEditor
              ? "Your assigned videos, with client revision requests first."
              : "Production queue grouped by deadline, with revision priority first."}
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/videos/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            New video
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4">
        <Bucket title="Overdue" videos={buckets.overdue} empty="Nothing overdue." />
        <Bucket title="Due today" videos={buckets.dueToday} empty="Nothing due today." />
        <Bucket
          title="Due tomorrow"
          videos={buckets.dueTomorrow}
          empty="Nothing due tomorrow."
        />
        <Bucket
          title="Upcoming"
          videos={buckets.upcoming}
          empty="No later or undated videos."
        />
        <Bucket title="Completed" videos={buckets.completed} empty="No completed videos." />
      </div>
    </main>
  );
}
