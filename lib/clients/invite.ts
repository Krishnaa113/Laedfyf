import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { defaultPermissionsForRole, canManageClientInvites } from "@/lib/roles";
import {
  INVITE_REQUIRED_ERROR,
  USE_PORTAL_LOGIN_ERROR,
} from "@/lib/clients/invite-messages";
import { portalPasswordFields } from "@/lib/clients/portal-password";
import { Client } from "@/models/Client";
import { User } from "@/models/User";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export { canManageClientInvites, INVITE_REQUIRED_ERROR, USE_PORTAL_LOGIN_ERROR };

export function createInviteToken() {
  return randomBytes(32).toString("hex");
}

export function inviteExpiry(from = new Date()) {
  return new Date(from.getTime() + INVITE_TTL_MS);
}

export function publicAppOrigin(request?: Request) {
  const configured = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  if (request) {
    return new URL(request.url).origin;
  }
  return "http://localhost:3000";
}

export function inviteLink(origin: string, token: string) {
  const base = origin.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/portal/set-password?token=${token}`;
}

export function isInviteTokenFormat(token: string) {
  return /^[a-f0-9]{64}$/i.test(token);
}

export function isInviteUnexpired(expiry: Date | string | null | undefined) {
  if (!expiry) {
    return false;
  }
  return new Date(expiry).getTime() > Date.now();
}

export type InviteKind = "invite" | "reset";

export async function issueClientInviteLink(
  clientId: string,
  origin: string,
  kind: InviteKind,
) {
  await connectDB();
  const client = await Client.findById(clientId)
    .select("+inviteToken passwordSet name companyName phone whatsapp email")
    .lean();
  if (!client) {
    return { ok: false as const, status: 404 as const, error: "Client not found" };
  }

  const passwordSet = Boolean(client.passwordSet);
  if (kind === "invite" && passwordSet) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "This client already has a password. Generate a reset link instead.",
    };
  }
  if (kind === "reset" && !passwordSet) {
    return {
      ok: false as const,
      status: 400 as const,
      error: "This client has not set a password yet. Generate an invite link instead.",
    };
  }

  const token = createInviteToken();
  const expiresAt = inviteExpiry();
  await Client.findByIdAndUpdate(clientId, {
    $set: { inviteToken: token, inviteTokenExpiry: expiresAt },
  });

  return {
    ok: true as const,
    invite: {
      clientId: String(client._id),
      clientName: String(client.companyName || client.name || ""),
      email: String(client.email ?? ""),
      phone: String(client.phone ?? ""),
      whatsapp: String(client.whatsapp || client.phone || ""),
      inviteLink: inviteLink(origin, token),
      expiresAt: expiresAt.toISOString(),
      kind,
    },
  };
}

export async function loadInviteClient(token: string) {
  if (!isInviteTokenFormat(token)) {
    return null;
  }
  await connectDB();
  const client = await Client.findOne({ inviteToken: token })
    .select("+inviteToken name companyName email passwordSet inviteTokenExpiry")
    .lean();
  if (!client || !isInviteUnexpired(client.inviteTokenExpiry)) {
    return null;
  }
  return client;
}

export async function setClientPasswordFromInvite(token: string, password: string) {
  await connectDB();
  const client = await Client.findOne({ inviteToken: token }).select(
    "+inviteToken +passwordHash email name companyName passwordSet inviteTokenExpiry",
  );
  if (!client || !isInviteUnexpired(client.inviteTokenExpiry)) {
    return {
      ok: false as const,
      status: 400 as const,
      error:
        "This invite link is invalid or has expired. Contact the agency for a new link.",
    };
  }

  const passwordFields = await portalPasswordFields(password);
  await Client.updateOne(
    { _id: client._id },
    {
      $set: passwordFields,
      $unset: { inviteToken: 1, inviteTokenExpiry: 1 },
    },
  );

  const linked = await upsertPortalUser({
    clientId: String(client._id),
    email: String(client.email),
    name: String(client.name || client.companyName || "Client"),
    passwordHash: passwordFields.passwordHash,
  });
  if (!linked.ok) {
    return linked;
  }

  return { ok: true as const, clientId: String(client._id) };
}

export async function upsertPortalUser(input: {
  clientId: string;
  email: string;
  name: string;
  passwordHash: string;
}) {
  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing && existing.role !== "client") {
    return {
      ok: false as const,
      status: 409 as const,
      error: "This email is already used by an internal staff account.",
    };
  }

  if (existing) {
    existing.name = input.name;
    existing.passwordHash = input.passwordHash;
    existing.role = "client";
    existing.clientId = new mongoose.Types.ObjectId(input.clientId);
    existing.isActive = true;
    existing.permissions = defaultPermissionsForRole("client");
    await existing.save();
    return { ok: true as const, userId: String(existing._id) };
  }

  const created = await User.create({
    name: input.name,
    email,
    passwordHash: input.passwordHash,
    role: "client",
    clientId: input.clientId,
    isActive: true,
    permissions: defaultPermissionsForRole("client"),
  });
  return { ok: true as const, userId: String(created._id) };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function authenticatePortalClient(
  identifier: string,
  password: string,
) {
  await connectDB();
  const trimmed = identifier.trim();
  if (!trimmed) {
    return { ok: false as const, error: "invalid" as const };
  }

  const nameRx = new RegExp(`^${escapeRegex(trimmed)}$`, "i");
  const filters: Record<string, unknown>[] = [
    { name: nameRx },
    { companyName: nameRx },
  ];
  if (trimmed.includes("@")) {
    filters.push({ email: trimmed.toLowerCase() });
  }

  const clients = await Client.find({ $or: filters }).select(
    "+passwordHash passwordSet name companyName email",
  );
  if (clients.length === 0) {
    return { ok: false as const, error: "invalid" as const };
  }

  const pending = clients.find((client) => !client.passwordSet || !client.passwordHash);
  const candidates = clients.filter((client) => client.passwordSet && client.passwordHash);

  for (const client of candidates) {
    const matches = await bcrypt.compare(password, client.passwordHash as string);
    if (!matches) {
      continue;
    }

    const linked = await upsertPortalUser({
      clientId: String(client._id),
      email: String(client.email),
      name: String(client.name || client.companyName || "Client"),
      passwordHash: client.passwordHash as string,
    });
    if (!linked.ok) {
      return { ok: false as const, error: "invalid" as const };
    }

    return {
      ok: true as const,
      user: {
        id: linked.userId,
        email: String(client.email),
        name: String(client.name || client.companyName || "Client"),
        role: "client" as const,
        employeeSubRole: null,
        clientId: String(client._id),
        employeeId: null,
        permissions: defaultPermissionsForRole("client"),
      },
    };
  }

  if (pending && candidates.length === 0) {
    return { ok: false as const, error: "invite" as const };
  }

  return { ok: false as const, error: "invalid" as const };
}
