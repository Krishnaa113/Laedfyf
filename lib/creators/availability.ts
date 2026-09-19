import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import {
  serializeCreatorAvailability,
  type SerializedCreatorAvailability,
} from "@/lib/serialize";
import { CreatorAvailability } from "@/models/CreatorAvailability";
import { Creator } from "@/models/Creator";

export async function loadCreatorAvailabilityList(creatorId?: string) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (creatorId) {
    filter.creatorId = new mongoose.Types.ObjectId(creatorId);
  }
  const docs = await CreatorAvailability.find(filter)
    .sort({ startsAt: 1 })
    .lean();
  return docs
    .map((doc) => serializeCreatorAvailability(doc))
    .filter((row): row is SerializedCreatorAvailability => Boolean(row));
}

export async function assertCreatorExists(creatorId: string) {
  const creator = await Creator.findById(creatorId).select("_id").lean();
  if (!creator) {
    return { ok: false as const, status: 404 as const, error: "Creator not found" };
  }
  return { ok: true as const };
}

