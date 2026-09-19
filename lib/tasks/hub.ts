import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { TASK_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import { serializeTask, type SerializedTask } from "@/lib/serialize";
import {
  TASK_RELATED_TYPES,
  normalizeTaskPriority,
  normalizeTaskStatus,
  type TaskRelatedType,
} from "@/lib/status";
import { Client } from "@/models/Client";
import { Order } from "@/models/Order";
import { Script } from "@/models/Script";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Video } from "@/models/Video";

void User;

export async function loadTaskList(
  auth: AuthOk,
  query: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    relatedType?: string;
  } = {},
) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (query.status) {
    filter.status = normalizeTaskStatus(query.status);
  }
  if (query.priority) {
    filter.priority = normalizeTaskPriority(query.priority);
  }
  if (query.assigneeId && mongoose.Types.ObjectId.isValid(query.assigneeId)) {
    filter.assigneeId = new mongoose.Types.ObjectId(query.assigneeId);
  }
  if (
    query.relatedType &&
    TASK_RELATED_TYPES.includes(query.relatedType as TaskRelatedType)
  ) {
    filter["relatedTo.type"] = query.relatedType;
  }

  void auth;

  const docs = await Task.find(filter)
    .populate(TASK_POPULATE)
    .sort({ deadline: 1, createdAt: -1 })
    .lean();

  return docs
    .map((doc) => serializeTask(doc as Record<string, unknown>))
    .filter((task): task is SerializedTask => Boolean(task));
}

export async function loadTaskHub(auth: AuthOk, taskId: string) {
  await connectDB();
  const doc = await Task.findById(taskId).populate(TASK_POPULATE).lean();
  if (!doc) {
    return { ok: false as const, status: 404 as const };
  }
  void auth;
  const task = serializeTask(doc as Record<string, unknown>);
  if (!task) {
    return { ok: false as const, status: 404 as const };
  }
  return { ok: true as const, hub: { task } };
}

export async function loadTaskAssignees() {
  await connectDB();
  const users = await User.find({
    role: { $in: ["owner", "admin", "employee"] },
    isActive: { $ne: false },
  })
    .select("name email role employeeSubRole")
    .sort({ name: 1 })
    .lean();

  return users.map((user) => ({
    id: String(user._id),
    name: String(user.name ?? ""),
    email: String(user.email ?? ""),
    role: String(user.role ?? ""),
  }));
}

export async function assertTaskRelatedTo(input: {
  relatedType?: string | null;
  relatedId?: string | null;
}): Promise<
  | { ok: true; relatedTo: { type: TaskRelatedType; id: string } | null; clientId: string | null }
  | { ok: false; status: number; error: string }
> {
  const type = input.relatedType || null;
  const id = input.relatedId || null;
  if (!type && !id) {
    return { ok: true, relatedTo: null, clientId: null };
  }
  if (!type || !id) {
    return {
      ok: false,
      status: 400,
      error: "Related type and id must be set together",
    };
  }
  if (!TASK_RELATED_TYPES.includes(type as TaskRelatedType)) {
    return { ok: false, status: 400, error: "Invalid related type" };
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { ok: false, status: 400, error: "Invalid related id" };
  }
  const relatedType = type as TaskRelatedType;

  if (relatedType === "Client") {
    const client = await Client.findById(id).lean();
    if (!client) {
      return { ok: false, status: 404, error: "Client not found" };
    }
    return { ok: true, relatedTo: { type: relatedType, id }, clientId: String(client._id) };
  }
  if (relatedType === "Order") {
    const order = await Order.findById(id).lean();
    if (!order) {
      return { ok: false, status: 404, error: "Order not found" };
    }
    return {
      ok: true,
      relatedTo: { type: relatedType, id },
      clientId: order.clientId ? String(order.clientId) : null,
    };
  }
  if (relatedType === "Script") {
    const script = await Script.findById(id).lean();
    if (!script) {
      return { ok: false, status: 404, error: "Script not found" };
    }
    return {
      ok: true,
      relatedTo: { type: relatedType, id },
      clientId: script.clientId ? String(script.clientId) : null,
    };
  }

  const video = await Video.findById(id).lean();
  if (!video) {
    return { ok: false, status: 404, error: "Video not found" };
  }
  return {
    ok: true,
    relatedTo: { type: relatedType, id },
    clientId: video.clientId ? String(video.clientId) : null,
  };
}
