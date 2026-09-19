import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { logActivity } from "@/lib/activity";
import { validationError } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { TASK_POPULATE } from "@/lib/populate";
import { requireAccess } from "@/lib/rbac";
import { serializeTask } from "@/lib/serialize";
import { assertTaskRelatedTo, loadTaskHub } from "@/lib/tasks/hub";
import { saveTaskAttachment } from "@/lib/uploads";
import { taskPatchSchema } from "@/lib/validators/task";
import { Task } from "@/models/Task";

type RouteContext = { params: Promise<{ id: string }> };

function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

function formList(form: FormData, key: string) {
  return form
    .getAll(key)
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(Boolean);
}

async function parsePatchBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const files: File[] = [];
  let payload: Record<string, unknown>;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    payload = {};
    for (const key of [
      "title",
      "description",
      "assigneeId",
      "relatedType",
      "relatedId",
      "priority",
      "status",
      "deadline",
    ]) {
      const value = formValue(form, key);
      if (value !== undefined) {
        payload[key] = value;
      }
    }
    if (form.has("attachments")) {
      payload.attachments = formList(form, "attachments");
    }
    for (const item of form.getAll("files")) {
      if (item instanceof File && item.size > 0) {
        files.push(item);
      }
    }
  } else {
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return { ok: false as const, error: "Invalid JSON body" };
    }
  }

  return { ok: true as const, payload, files };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAccess("tasks", "read");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const result = await loadTaskHub(auth, id);
  if (!result.ok) {
    return NextResponse.json({ error: "Task not found" }, { status: result.status });
  }

  return NextResponse.json(result.hub);
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAccess("tasks", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  const parsedBody = await parsePatchBody(request);
  if (!parsedBody.ok) {
    return NextResponse.json({ error: parsedBody.error }, { status: 400 });
  }

  const parsed = taskPatchSchema.safeParse(parsedBody.payload);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  await connectDB();
  const existing = await Task.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined && key !== "relatedType" && key !== "relatedId") {
      updates[key] = value;
    }
  }

  const nextRelatedType =
    parsed.data.relatedType !== undefined
      ? parsed.data.relatedType
      : existing.relatedTo?.type
        ? String(existing.relatedTo.type)
        : null;
  const nextRelatedId =
    parsed.data.relatedId !== undefined
      ? parsed.data.relatedId
      : existing.relatedTo?.id
        ? String(existing.relatedTo.id)
        : null;

  if (
    parsed.data.relatedType !== undefined ||
    parsed.data.relatedId !== undefined
  ) {
    const related = await assertTaskRelatedTo({
      relatedType: nextRelatedType,
      relatedId: nextRelatedId,
    });
    if (!related.ok) {
      return NextResponse.json({ error: related.error }, { status: related.status });
    }
    updates.relatedTo = related.relatedTo
      ? { type: related.relatedTo.type, id: related.relatedTo.id }
      : { type: null, id: null };
    updates.clientId = related.clientId;
  }

  const uploaded: string[] = [];
  for (const file of parsedBody.files) {
    const saved = await saveTaskAttachment(file);
    if (!saved.ok) {
      return NextResponse.json({ error: saved.error }, { status: 400 });
    }
    uploaded.push(saved.url);
  }
  if (uploaded.length > 0) {
    const current = Array.isArray(parsed.data.attachments)
      ? parsed.data.attachments
      : Array.isArray(existing.attachments)
        ? existing.attachments.map(String)
        : [];
    updates.attachments = [...current, ...uploaded];
  }

  const task = (await Task.findByIdAndUpdate(
    id,
    { $set: updates },
    { returnDocument: "after", runValidators: true },
  )
    .populate(TASK_POPULATE)
    .lean()) as Record<string, unknown> | null;

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await logActivity({
    actorId: auth.session.user.id,
    action: "task.updated",
    entityType: "Task",
    entityId: id,
    metadata: { changes: Object.keys(updates) },
  });

  return NextResponse.json({ task: serializeTask(task) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireAccess("tasks", "write");
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  }

  await connectDB();
  const existing = await Task.findById(id).lean();
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await Task.findByIdAndDelete(id);
  await logActivity({
    actorId: auth.session.user.id,
    action: "task.deleted",
    entityType: "Task",
    entityId: id,
    metadata: { title: existing.title },
  });

  return NextResponse.json({ ok: true });
}
