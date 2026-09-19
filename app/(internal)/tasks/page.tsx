import Link from "next/link";
import { loadTaskAssignees, loadTaskList } from "@/lib/tasks/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RELATED_TYPES,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/status";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/status-badge";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    assigneeId?: string;
    relatedType?: string;
  }>;
}) {
  const auth = await requirePageAccess("tasks", "read");
  const canWrite = pageCanWrite(auth, "tasks");
  const params = await searchParams;
  const [tasks, assignees] = await Promise.all([
    loadTaskList(auth, {
      status: params.status || undefined,
      priority: params.priority || undefined,
      assigneeId: params.assigneeId || undefined,
      relatedType: params.relatedType || undefined,
    }),
    loadTaskAssignees(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="mt-1 text-sm text-white/60">
            Internal work items with assignee, priority, deadline, and optional links.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/tasks/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            New task
          </Link>
        ) : null}
      </div>
      <form className="flex flex-wrap items-end gap-3" action="/tasks">
        <label className="flex w-40 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All statuses</option>
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-36 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Priority</span>
          <select
            name="priority"
            defaultValue={params.priority ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">All</option>
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-48 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Assignee</span>
          <select
            name="assigneeId"
            defaultValue={params.assigneeId ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Anyone</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-40 flex-col gap-1.5 text-sm">
          <span className="text-white/50">Related</span>
          <select
            name="relatedType"
            defaultValue={params.relatedType ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Any type</option>
            {TASK_RELATED_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
        >
          Filter
        </button>
      </form>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium">Related</th>
              <th className="px-4 py-3 font-medium">Deadline</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/50">
                  No tasks yet.
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="border-t border-white/10">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${task.id}`} className="hover:text-brand">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/70">{task.assigneeName || "Unassigned"}</td>
                  <td className="px-4 py-3 text-white/70">
                    {task.relatedTo ? (
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
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {task.deadline ? task.deadline.slice(0, 10) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TaskPriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <TaskStatusBadge status={task.status} />
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
