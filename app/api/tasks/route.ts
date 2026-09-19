import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { TASK_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeTask } from "@/lib/serialize";
import {
  assertTaskRelatedTo,
  loadTaskAssignees,
  loadTaskList,
} from "@/lib/tasks/hub";
import { saveTaskAttachment } from "@/lib/uploads";
import { taskInputSchema } from "@/lib/validators/task";
import { Task } from "@/models/Task";

function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function formList(form: FormData, key: string) {
  return form
    .getAll(key)
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean);
}

async function parseTaskBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const files: File[] = [];
  let payload: unknown;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    payload = {
      title: formValue(form, "title"),
      description: formValue(form, "description"),
      assigneeId: formValue(form, "assigneeId"),
      relatedType: formValue(form, "relatedType"),
      relatedId: formValue(form, "relatedId"),
      priority: formValue(form, "priority") || "Medium",
      status: formValue(form, "status") || "To Do",
      deadline: formValue(form, "deadline"),
      attachments: formList(form, "attachments"),
    };
    for (const item of form.getAll("files")) {
      if (item instanceof File && item.size > 0) {
        files.push(item);
      }
    }
  } else {
    try {
      payload = await request.json();
    } catch {
      return { ok: false as const, error: "Invalid JSON body" };
    }
  }

  return { ok: true as const, payload, files };
}

export async function GET(request: Request) {
  const auth = await requireAccess("tasks", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const assigneeId = searchParams.get("assigneeId");
  if (assigneeId && !mongoose.Types.ObjectId.isValid(assigneeId)) {
    return NextResponse.json({ error: "Invalid assignee id" }, { status: 400 });
  }

  const [tasks, assignees] = await Promise.all([
    loadTaskList(auth, {
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      assigneeId: assigneeId ?? undefined,
      relatedType: searchParams.get("relatedType") ?? undefined,
    }),
    loadTaskAssignees(),
  ]);

  return NextResponse.json({ tasks, assignees });
}

export async function POST(request: Request) {
  const auth = await requireAccess("tasks", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const parsedBody = await parseTaskBody(request);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const parsed = taskInputSchema.safeParse(parsedBody.payload);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  if (
    parsed.data.assigneeId &&
    !mongoose.Types.ObjectId.isValid(parsed.data.assigneeId)
  ) {
    return NextResponse.json({ error: "Invalid assignee id" }, { status: 400 });
  }

  await connectDB();
  const related = await assertTaskRelatedTo({
    relatedType: parsed.data.relatedType,
    relatedId: parsed.data.relatedId,
  });
  if (!related.ok) {
    return NextResponse.json({ error: related.error }, { status: related.status });
  }

  const uploaded: string[] = [];
  for (const file of parsedBody.files) {
    const saved = await saveTaskAttachment(file);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    uploaded.push(saved.url);
  }

  const created = await Task.create({
    title: parsed.data.title,
    description: parsed.data.description,
    assigneeId: parsed.data.assigneeId ?? undefined,
    createdById: mongoose.Types.ObjectId.isValid(auth.session.user.id)
      ? auth.session.user.id
      : undefined,
    clientId: related.clientId ?? undefined,
    relatedTo: related.relatedTo
      ? { type: related.relatedTo.type, id: related.relatedTo.id }
      : { type: null, id: null },
    priority: parsed.data.priority,
    status: parsed.data.status,
    deadline: parsed.data.deadline ?? null,
    attachments: [...parsed.data.attachments, ...uploaded],
  });

  await logActivity({
    actorId: auth.session.user.id,
    action: "task.created",
    entityType: "Task",
    entityId: created._id,
    metadata: {
      assigneeId: parsed.data.assigneeId ?? null,
      relatedTo: related.relatedTo,
    },
  });

  const populated = await Task.findById(created._id).populate(TASK_POPULATE).lean();
  return NextResponse.json(
    { task: serializeTask(populated as Record<string, unknown> | null) },
    { status: 201 },
  );
}
