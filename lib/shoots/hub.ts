import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { SHOOT_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import { serializeShoot, type SerializedShoot } from "@/lib/serialize";
import { parseOptionalObjectId } from "@/lib/scripts/hub";
import {
  mergePreShootChecklist,
  type PreShootChecklist,
} from "@/lib/shoots/checklist";
import { DEFAULT_SHOOT_DURATION_MS, resolveShootWindow } from "@/lib/shoots/overlap";
import { normalizeScriptStatus, normalizeShootStatus } from "@/lib/status";
import { Client } from "@/models/Client";
import { Creator } from "@/models/Creator";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { Script } from "@/models/Script";
import { Shoot } from "@/models/Shoot";
import { User } from "@/models/User";

void User;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { parseOptionalObjectId };

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

export function parseRangeBound(
  value: string | null,
  label: string,
): { ok: true; value?: Date } | { ok: false; error: string } {
  if (!value) {
    return { ok: true, value: undefined };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: `Invalid ${label}` };
  }
  return { ok: true, value: date };
}

export function parseOptionalObjectIdList(
  value: unknown,
  label: string,
): { ok: true; value: string[] | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(value)) {
    return { ok: false, error: `Invalid ${label}` };
  }

  const ids: string[] = [];
  for (const item of value) {
    if (!item) {
      continue;
    }
    if (typeof item !== "string" || !mongoose.Types.ObjectId.isValid(item)) {
      return { ok: false, error: `Invalid ${label}` };
    }
    ids.push(item);
  }

  return { ok: true, value: ids };
}

export function persistedShootWindow(
  scheduledAt: Date | null | undefined,
  endsAt: Date | null | undefined,
) {
  if (!scheduledAt) {
    return { scheduledAt: null as Date | null, endsAt: endsAt ?? null };
  }
  const window = resolveShootWindow(scheduledAt, endsAt ?? null);
  return { scheduledAt: window.start, endsAt: window.end };
}

export function existingIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (item && typeof item === "object" && "_id" in (item as object)) {
        return String((item as { _id: unknown })._id);
      }
      return item ? String(item) : "";
    })
    .filter(Boolean);
}

export function nextAssignedId(
  parsed: { ok: true; value: string | null | undefined } | { ok: false; error: string },
  existing: unknown,
) {
  if (!parsed.ok) {
    return null;
  }
  if (parsed.value !== undefined) {
    return parsed.value;
  }
  return existing ? String(existing) : null;
}

export async function loadShootList(
  auth: AuthOk,
  query: {
    q?: string;
    status?: string;
    clientId?: string;
    creatorId?: string;
    from?: Date;
    to?: Date;
  } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.clientId) {
    filter.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  if (query.creatorId) {
    filter.creatorId = new mongoose.Types.ObjectId(query.creatorId);
  }
  if (query.status) {
    filter.status = normalizeShootStatus(query.status);
  }
  if (query.q?.trim()) {
    filter.location = new RegExp(escapeRegex(query.q.trim()), "i");
  }
  if (query.from || query.to) {
    const fromDate = query.from ?? new Date(0);
    const toDate = query.to ?? new Date("9999-12-31T00:00:00.000Z");
    filter.scheduledAt = { $ne: null, $lt: toDate };
    filter.$or = [
      { endsAt: { $gt: fromDate } },
      {
        endsAt: null,
        scheduledAt: {
          $gte: new Date(fromDate.getTime() - DEFAULT_SHOOT_DURATION_MS),
        },
      },
    ];
  }

  const docs = await Shoot.find(auth.byClient(filter))
    .populate(SHOOT_POPULATE)
    .sort({ scheduledAt: -1, createdAt: -1 })
    .lean();

  return docs
    .map((doc) => serializeShoot(doc))
    .filter((shoot): shoot is SerializedShoot => Boolean(shoot));
}

export async function loadShootHub(auth: AuthOk, shootId: string) {
  await connectDB();

  const doc = await Shoot.findById(shootId).populate(SHOOT_POPULATE).lean();
  if (!doc) {
    return { ok: false as const, status: 404 as const };
  }

  const clientId =
    doc.clientId && typeof doc.clientId === "object" && "_id" in doc.clientId
      ? String((doc.clientId as { _id: unknown })._id)
      : String(doc.clientId ?? "");

  if (!auth.canAccessClient(clientId)) {
    return { ok: false as const, status: 403 as const };
  }

  const shoot = serializeShoot(doc as Record<string, unknown>);
  if (!shoot) {
    return { ok: false as const, status: 404 as const };
  }

  return { ok: true as const, hub: { shoot } };
}

async function assertEmployeeRef(
  employeeId: string | null | undefined,
  label: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!employeeId) {
    return { ok: true };
  }
  const employee = await Employee.findById(employeeId).lean();
  if (!employee) {
    return { ok: false, status: 400, error: `${label} not found` };
  }
  return { ok: true };
}

export async function assertShootRefs(input: {
  clientId: string;
  orderId?: string | null;
  creatorId?: string | null;
  cameramanId?: string | null;
  shootManagerId?: string | null;
  assistantId?: string | null;
  approvedScriptIds?: string[] | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const client = await Client.findById(input.clientId).lean();
  if (!client) {
    return { ok: false, status: 404, error: "Client not found" };
  }

  if (input.orderId) {
    const order = await Order.findById(input.orderId).lean();
    if (!order) {
      return { ok: false, status: 404, error: "Order not found" };
    }
    if (String(order.clientId) !== input.clientId) {
      return {
        ok: false,
        status: 400,
        error: "Order does not belong to this client",
      };
    }
  }

  if (input.creatorId) {
    const creator = await Creator.findById(input.creatorId).lean();
    if (!creator) {
      return { ok: false, status: 400, error: "Creator not found" };
    }
  }

  const cameraman = await assertEmployeeRef(input.cameramanId, "Cameraman");
  if (!cameraman.ok) {
    return cameraman;
  }
  const manager = await assertEmployeeRef(input.shootManagerId, "Shoot manager");
  if (!manager.ok) {
    return manager;
  }
  const assistant = await assertEmployeeRef(input.assistantId, "Shooting assistant");
  if (!assistant.ok) {
    return assistant;
  }

  if (input.approvedScriptIds?.length) {
    const scripts = await Script.find({
      _id: { $in: input.approvedScriptIds },
    }).lean();
    if (scripts.length !== input.approvedScriptIds.length) {
      return { ok: false, status: 400, error: "Approved script not found" };
    }
    for (const script of scripts) {
      if (String(script.clientId) !== input.clientId) {
        return {
          ok: false,
          status: 400,
          error: "Script does not belong to this client",
        };
      }
      const status = normalizeScriptStatus(script.status);
      if (status !== "Approved" && status !== "Ready for Shoot") {
        return {
          ok: false,
          status: 400,
          error: "Only approved scripts can be attached to a shoot",
        };
      }
    }
  }

  return { ok: true };
}

export function resolvedChecklist(
  current: unknown,
  patch: Partial<PreShootChecklist> | undefined,
) {
  return mergePreShootChecklist(current, patch);
}
