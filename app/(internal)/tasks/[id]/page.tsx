import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadTaskHub } from "@/lib/tasks/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/status-badge";
import { DeleteTaskButton } from "@/components/tasks/delete-task-button";
import { TaskStatusForm } from "@/components/tasks/task-status-form";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("tasks", "read");
  const canWrite = pageCanWrite(auth, "tasks");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }
  const result = await loadTaskHub(auth, id);
  if (!result.ok) {
    notFound();
  }
  const { task } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/tasks" className="text-sm text-white/50 hover:text-brand">
            Back to tasks
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">{task.title}</h1>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>
        {canWrite ? (
          <div className="flex items-center gap-3">
            <Link
              href={`/tasks/${task.id}/edit`}
              className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
            >
              Edit
            </Link>
            <DeleteTaskButton taskId={task.id} label={task.title} />
          </div>
        ) : null}
      </div>
      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Assignee" value={task.assigneeName || "Unassigned"} />
        <Info label="Created by" value={task.createdByName || "—"} />
        <Info label="Deadline" value={task.deadline?.slice(0, 10) || "—"} />
        <Info
          label="Related"
          value={
            task.relatedTo ? (
              task.relatedHref ? (
                <Link href={task.relatedHref} className="hover:text-brand">
                  {task.relatedTo.type}
                  {task.relatedLabel ? ` · ${task.relatedLabel}` : ""}
                </Link>
              ) : (
                task.relatedTo.type
              )
            ) : (
              "—"
            )
          }
        />
      </section>
      {task.description ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-white/80">{task.description}</p>
        </section>
      ) : null}
      {task.attachments.length > 0 ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Attachments</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {task.attachments.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                  {url.split("/").pop() || url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {canWrite ? <TaskStatusForm taskId={task.id} status={task.status} /> : null}
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
