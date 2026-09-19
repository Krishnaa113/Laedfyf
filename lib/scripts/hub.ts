import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { SCRIPT_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import {
  serializeOptions,
  serializeScript,
  type SerializedScript,
} from "@/lib/serialize";
import { CLIENT_VISIBLE_SCRIPT_STATUSES, normalizeScriptStatus } from "@/lib/status";
import { Client } from "@/models/Client";
import { Creator } from "@/models/Creator";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { Script } from "@/models/Script";
import { User } from "@/models/User";

void Employee;
void User;
void Creator;
void Client;

export type ScriptHub = {
  script: SerializedScript;
};

export type ScriptHubResult =
  | { ok: true; hub: ScriptHub }
  | { ok: false; status: 403 | 404 };

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractClientId(doc: Record<string, unknown>): string {
  const value = doc.clientId;
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return value ? String(value) : "";
}

export function parseOptionalObjectId(
  value: unknown,
  label: string,
): { ok: true; value: string | null | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
    return { ok: true, value };
  }
  return { ok: false, error: `Invalid ${label}` };
}

export async function loadScriptList(
  auth: AuthOk,
  query: { q?: string; status?: string; clientId?: string; orderId?: string } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.clientId) {
    filter.clientId = new mongoose.Types.ObjectId(query.clientId);
  }
  if (query.orderId) {
    filter.orderId = new mongoose.Types.ObjectId(query.orderId);
  }
  if (query.status) {
    filter.status = normalizeScriptStatus(query.status);
  }
  if (query.q?.trim()) {
    const rx = new RegExp(escapeRegex(query.q.trim()), "i");
    const asNumber = Number(query.q.trim());
    filter.$or = [
      { language: rx },
      { scriptText: rx },
      ...(Number.isInteger(asNumber) && asNumber > 0
        ? [{ videoNumber: asNumber }]
        : []),
    ];
  }

  const docs = await Script.find(auth.byClient(filter))
    .populate(SCRIPT_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  const options = serializeOptions(auth.session.user);
  return docs
    .map((doc) => serializeScript(doc, options))
    .filter((script): script is SerializedScript => Boolean(script))
    .filter((script) =>
      options.audience === "portal"
        ? CLIENT_VISIBLE_SCRIPT_STATUSES.includes(script.status)
        : true,
    );
}

export async function loadScriptHub(
  auth: AuthOk,
  scriptId: string,
): Promise<ScriptHubResult> {
  await connectDB();

  const doc = await Script.findById(scriptId).populate(SCRIPT_POPULATE).lean();
  if (!doc) {
    return { ok: false, status: 404 };
  }

  if (!auth.canAccessClient(extractClientId(doc as Record<string, unknown>))) {
    return { ok: false, status: 403 };
  }

  const options = serializeOptions(auth.session.user);
  const script = serializeScript(doc as Record<string, unknown>, options);
  if (!script) {
    return { ok: false, status: 404 };
  }
  if (
    options.audience === "portal" &&
    !CLIENT_VISIBLE_SCRIPT_STATUSES.includes(script.status)
  ) {
    return { ok: false, status: 404 };
  }

  return { ok: true, hub: { script } };
}

export async function assertScriptRefs(input: {
  clientId: string;
  orderId?: string | null;
  writerId?: string | null;
  creatorId?: string | null;
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

  if (input.writerId) {
    const writer = await Employee.findById(input.writerId).lean();
    if (!writer) {
      return { ok: false, status: 400, error: "Writer not found" };
    }
  }

  if (input.creatorId) {
    const creator = await Creator.findById(input.creatorId).lean();
    if (!creator) {
      return { ok: false, status: 400, error: "Creator not found" };
    }
  }

  return { ok: true };
}

export function commentAuthor(auth: AuthOk) {
  const user = auth.session.user;
  const roleLabel = user.employeeSubRole
    ? `${user.role}:${user.employeeSubRole}`
    : user.role;

  return {
    authorId: mongoose.Types.ObjectId.isValid(user.id) ? user.id : null,
    authorName: user.name?.trim() || user.email || "Unknown",
    authorRole: roleLabel,
  };
}
