"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_RELATED_TYPES,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  normalizeTaskPriority,
  normalizeTaskStatus,
} from "@/lib/status";

type Assignee = { id: string; name: string; email: string };
type RelatedOption = { id: string; label: string };

export function TaskForm({
  taskId,
  initialValues,
}: {
  taskId?: string;
  initialValues?: {
    title?: string;
    description?: string;
    assigneeId?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
    priority?: string;
    status?: string;
    deadline?: string | null;
    attachments?: string[];
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [relatedType, setRelatedType] = useState(initialValues?.relatedType ?? "");
  const [relatedOptions, setRelatedOptions] = useState<RelatedOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadAssignees() {
      const response = await fetch("/api/tasks");
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as { assignees?: Assignee[] };
      if (!cancelled) {
        setAssignees(data.assignees ?? []);
      }
    }
    void loadAssignees();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRelated() {
      if (!relatedType) {
        setRelatedOptions([]);
        return;
      }
      const endpoint =
        relatedType === "Client"
          ? "/api/clients"
          : relatedType === "Order"
            ? "/api/orders"
            : relatedType === "Script"
              ? "/api/scripts"
              : "/api/videos";
      const response = await fetch(endpoint);
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as Record<string, unknown>;
      const rows = (data.clients ?? data.orders ?? data.scripts ?? data.videos ?? []) as Array<{
        id: string;
        companyName?: string;
        name?: string;
        packageName?: string;
        videoNumber?: number;
      }>;
      if (!cancelled) {
        setRelatedOptions(
          rows.map((row) => ({
            id: row.id,
            label:
              relatedType === "Client"
                ? row.companyName || row.name || row.id
                : relatedType === "Order"
                  ? row.packageName || row.id
                  : relatedType === "Script"
                    ? row.videoNumber
                      ? `Script #${row.videoNumber}`
                      : row.id
                    : row.packageName || row.id,
          })),
        );
      }
    }
    void loadRelated();
    return () => {
      cancelled = true;
    };
  }, [relatedType]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch(taskId ? `/api/tasks/${taskId}` : "/api/tasks", {
      method: taskId ? "PATCH" : "POST",
      body: new FormData(event.currentTarget),
    });
    const data = (await response.json()) as { error?: string; task?: { id: string } };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not save task.");
      return;
    }
    router.push(data.task?.id ? `/tasks/${data.task.id}` : "/tasks");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Title</span>
        <input
          name="title"
          required
          defaultValue={initialValues?.title ?? ""}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Description</span>
        <textarea
          name="description"
          rows={4}
          defaultValue={initialValues?.description ?? ""}
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Assignee</span>
          <select
            key={assignees.length}
            name="assigneeId"
            defaultValue={initialValues?.assigneeId ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">Unassigned</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Priority</span>
          <select
            name="priority"
            defaultValue={normalizeTaskPriority(initialValues?.priority)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Status</span>
          <select
            name="status"
            defaultValue={normalizeTaskStatus(initialValues?.status)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Deadline</span>
          <input
            type="date"
            name="deadline"
            defaultValue={initialValues?.deadline?.slice(0, 10) ?? ""}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Related to</span>
          <select
            name="relatedType"
            value={relatedType}
            onChange={(event) => setRelatedType(event.target.value)}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
          >
            <option value="">None</option>
            {TASK_RELATED_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-white/50">Linked record</span>
          <select
            key={`${relatedType}-${relatedOptions.length}`}
            name="relatedId"
            defaultValue={initialValues?.relatedId ?? ""}
            disabled={!relatedType}
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand disabled:opacity-50"
          >
            <option value="">Select record</option>
            {relatedOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {(initialValues?.attachments ?? []).map((url) => (
        <input key={url} type="hidden" name="attachments" value={url} />
      ))}
      {(initialValues?.attachments ?? []).length > 0 ? (
        <ul className="text-sm text-white/70">
          {initialValues?.attachments?.map((url) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                {url.split("/").pop() || url}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/50">Attachments</span>
        <input
          name="files"
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/webp"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-brand file:px-3 file:py-1 file:text-charcoal"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Saving…" : taskId ? "Save task" : "Create task"}
      </button>
    </form>
  );
}
