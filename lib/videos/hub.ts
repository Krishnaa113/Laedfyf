import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { VIDEO_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import {
  serializeOptions,
  serializeVideo,
  type SerializedVideo,
} from "@/lib/serialize";
import { parseOptionalObjectId } from "@/lib/scripts/hub";
import {
  CLIENT_VISIBLE_VIDEO_STATUSES,
  normalizeVideoStatus,
  VIDEO_COMPLETED_STATUSES,
  type VideoStatus,
} from "@/lib/status";
import { Client } from "@/models/Client";
import { Creator } from "@/models/Creator";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { Script } from "@/models/Script";
import { Shoot } from "@/models/Shoot";
import { User } from "@/models/User";
import { Video } from "@/models/Video";

void User;

export { parseOptionalObjectId };

export function extractClientId(doc: Record<string, unknown>): string {
  const value = doc.clientId;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return value ? String(value) : "";
}

export function parseDateValue(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function loadVideoList(
  auth: AuthOk,
  query: {
    q?: string;
    status?: string;
    clientId?: string;
    orderId?: string;
    editorId?: string;
  } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.clientId) {
    filter.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  if (query.orderId) {
    filter.orderId = new mongoose.Types.ObjectId(query.orderId);
  }
  if (query.editorId) {
    filter.editorId = new mongoose.Types.ObjectId(query.editorId);
  }
  if (query.status) {
    filter.status = normalizeVideoStatus(query.status);
  }
  if (query.q?.trim()) {
    const rx = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ fileLink: rx }, { thumbnailUrl: rx }, { finalDeliveryLink: rx }];
  }

  const docs = await Video.find(auth.byClient(filter))
    .populate(VIDEO_POPULATE)
    .sort({ deadline: 1, createdAt: -1 })
    .lean();

  const options = serializeOptions(auth.session.user);
  return docs
    .map((doc) => serializeVideo(doc, options))
    .filter((video): video is SerializedVideo => Boolean(video))
    .filter((video) =>
      options.audience === "portal"
        ? CLIENT_VISIBLE_VIDEO_STATUSES.includes(video.status)
        : true,
    );
}

export async function loadVideoHub(auth: AuthOk, videoId: string) {
  await connectDB();

  const doc = await Video.findById(videoId).populate(VIDEO_POPULATE).lean();
  if (!doc) {
    return { ok: false as const, status: 404 as const };
  }

  if (!auth.canAccessClient(extractClientId(doc as Record<string, unknown>))) {
    return { ok: false as const, status: 403 as const };
  }

  const options = serializeOptions(auth.session.user);
  const video = serializeVideo(doc as Record<string, unknown>, options);
  if (!video) {
    return { ok: false as const, status: 404 as const };
  }
  if (
    options.audience === "portal" &&
    !CLIENT_VISIBLE_VIDEO_STATUSES.includes(video.status)
  ) {
    return { ok: false as const, status: 404 as const };
  }

  return { ok: true as const, hub: { video } };
}

export async function editorEmployeeIdForUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  await connectDB();
  const employee = await Employee.findOne({ userId }).select("_id").lean();
  return employee ? String(employee._id) : null;
}

export function isCompletedVideoStatus(status: VideoStatus) {
  return VIDEO_COMPLETED_STATUSES.includes(status);
}

export async function assertVideoRefs(input: {
  clientId: string;
  orderId: string;
  scriptId?: string | null;
  creatorId?: string | null;
  shootId?: string | null;
  editorId?: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const client = await Client.findById(input.clientId).lean();
  if (!client) {
    return { ok: false, status: 404, error: "Client not found" };
  }

  const order = await Order.findById(input.orderId).lean();
  if (!order) {
    return { ok: false, status: 404, error: "Order not found" };
  }
  if (String(order.clientId) !== input.clientId) {
    return { ok: false, status: 400, error: "Order does not belong to this client" };
  }

  if (input.scriptId) {
    const script = await Script.findById(input.scriptId).lean();
    if (!script) {
      return { ok: false, status: 400, error: "Script not found" };
    }
    if (String(script.clientId) !== input.clientId) {
      return { ok: false, status: 400, error: "Script does not belong to this client" };
    }
  }

  if (input.creatorId) {
    const creator = await Creator.findById(input.creatorId).lean();
    if (!creator) {
      return { ok: false, status: 400, error: "Creator not found" };
    }
  }

  if (input.shootId) {
    const shoot = await Shoot.findById(input.shootId).lean();
    if (!shoot) {
      return { ok: false, status: 400, error: "Shoot not found" };
    }
    if (String(shoot.clientId) !== input.clientId) {
      return { ok: false, status: 400, error: "Shoot does not belong to this client" };
    }
  }

  if (input.editorId) {
    const editor = await Employee.findById(input.editorId).lean();
    if (!editor) {
      return { ok: false, status: 400, error: "Assigned editor not found" };
    }
  }

  return { ok: true };
}
