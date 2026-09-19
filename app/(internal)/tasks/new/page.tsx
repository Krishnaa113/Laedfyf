import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { TaskForm } from "@/components/tasks/task-form";

export default async function NewTaskPage() {
  await requirePageAccess("tasks", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/tasks" className="text-sm text-white/50 hover:text-brand">
          Back to tasks
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New task</h1>
      </div>
      <TaskForm />
    </main>
  );
}
