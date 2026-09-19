import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadTaskHub } from "@/lib/tasks/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { TaskForm } from "@/components/tasks/task-form";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("tasks", "write");
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href={`/tasks/${task.id}`} className="text-sm text-white/50 hover:text-brand">
          Back to task
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit task</h1>
      </div>
      <TaskForm
        taskId={task.id}
        initialValues={{
          title: task.title,
          description: task.description,
          assigneeId: task.assigneeId,
          relatedType: task.relatedTo?.type ?? "",
          relatedId: task.relatedTo?.id ?? "",
          priority: task.priority,
          status: task.status,
          deadline: task.deadline,
          attachments: task.attachments,
        }}
      />
    </main>
  );
}
