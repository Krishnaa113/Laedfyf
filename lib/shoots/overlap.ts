import mongoose from "mongoose";
import { CreatorAvailability } from "@/models/CreatorAvailability";
import { Shoot } from "@/models/Shoot";

const BLOCKING_AVAILABILITY = ["Booked", "Unavailable", "On Hold"];

export const DEFAULT_SHOOT_DURATION_MS = 2 * 60 * 60 * 1000;

export function resolveShootWindow(
  scheduledAt: Date,
  endsAt: Date | null | undefined,
) {
  const start = scheduledAt;
  const end =
    endsAt && endsAt.getTime() > start.getTime()
      ? endsAt
      : new Date(start.getTime() + DEFAULT_SHOOT_DURATION_MS);
  return { start, end };
}

export async function findOverlappingCreatorShoot(input: {
  creatorId: string;
  scheduledAt: Date;
  endsAt?: Date | null;
  excludeShootId?: string | null;
}) {
  const { start, end } = resolveShootWindow(input.scheduledAt, input.endsAt);
  const match: Record<string, unknown> = {
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
    status: { $nin: ["Cancelled"] },
    scheduledAt: { $ne: null },
  };

  if (input.excludeShootId && mongoose.Types.ObjectId.isValid(input.excludeShootId)) {
    match._id = { $ne: new mongoose.Types.ObjectId(input.excludeShootId) };
  }

  const docs = await Shoot.find(match)
    .select("creatorId scheduledAt endsAt location status")
    .lean();

  return (
    docs.find((doc) => {
      const otherStart = new Date(String(doc.scheduledAt));
      if (Number.isNaN(otherStart.getTime())) {
        return false;
      }
      const storedEnd = doc.endsAt ? new Date(String(doc.endsAt)) : null;
      const otherEnd = resolveShootWindow(otherStart, storedEnd).end;
      return otherStart.getTime() < end.getTime() && otherEnd.getTime() > start.getTime();
    }) ?? null
  );
}

export async function assertCreatorAvailableForShoot(input: {
  creatorId: string | null | undefined;
  scheduledAt: Date | null | undefined;
  endsAt?: Date | null;
  excludeShootId?: string | null;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!input.creatorId) {
    return { ok: true };
  }

  if (!input.scheduledAt) {
    return {
      ok: false,
      status: 400,
      error: "Schedule a start time before assigning a creator",
    };
  }

  const overlap = await findOverlappingCreatorShoot({
    creatorId: input.creatorId,
    scheduledAt: input.scheduledAt,
    endsAt: input.endsAt ?? null,
    excludeShootId: input.excludeShootId,
  });

  if (overlap) {
    return {
      ok: false,
      status: 409,
      error: "Creator is already booked for an overlapping shoot",
    };
  }

  const blocked = await findBlockingAvailability({
    creatorId: input.creatorId,
    scheduledAt: input.scheduledAt,
    endsAt: input.endsAt ?? null,
  });
  if (blocked) {
    return {
      ok: false,
      status: 409,
      error: "Creator is marked unavailable for this window",
    };
  }

  return { ok: true };
}

export async function findBlockingAvailability(input: {
  creatorId: string;
  scheduledAt: Date;
  endsAt?: Date | null;
  excludeId?: string | null;
}) {
  const { start, end } = resolveShootWindow(input.scheduledAt, input.endsAt);
  const match: Record<string, unknown> = {
    creatorId: new mongoose.Types.ObjectId(input.creatorId),
    status: { $in: BLOCKING_AVAILABILITY },
    startsAt: { $ne: null },
  };
  if (input.excludeId && mongoose.Types.ObjectId.isValid(input.excludeId)) {
    match._id = { $ne: new mongoose.Types.ObjectId(input.excludeId) };
  }

  const docs = await CreatorAvailability.find(match)
    .select("startsAt endsAt status notes")
    .lean();

  return (
    docs.find((doc) => {
      const otherStart = new Date(String(doc.startsAt));
      if (Number.isNaN(otherStart.getTime())) {
        return false;
      }
      const storedEnd = doc.endsAt ? new Date(String(doc.endsAt)) : null;
      const otherEnd = resolveShootWindow(otherStart, storedEnd).end;
      return otherStart.getTime() < end.getTime() && otherEnd.getTime() > start.getTime();
    }) ?? null
  );
}
