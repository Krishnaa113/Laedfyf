import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { loadCreatorAvailabilityList } from "@/lib/creators/availability";
import { SHOOT_POPULATE } from "@/lib/populate";
import { serializeCreator, serializeShoot, type SerializedShoot } from "@/lib/serialize";
import { normalizeCreatorAvailability } from "@/lib/status";
import { Creator } from "@/models/Creator";
import { Shoot } from "@/models/Shoot";

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadCreatorList(
  query: {
    q?: string;
    availability?: string;
    location?: string;
    includePayout?: boolean;
  } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> = {};
  if (query.availability) {
    filter.availability = normalizeCreatorAvailability(query.availability);
  }
  if (query.location?.trim()) {
    filter.location = new RegExp(escapeRegex(query.location.trim()), "i");
  }
  if (query.q?.trim()) {
    const rx = new RegExp(escapeRegex(query.q.trim()), "i");
    filter.$or = [
      { name: rx },
      { location: rx },
      { languages: rx },
      { niches: rx },
      { email: rx },
      { phone: rx },
    ];
  }

  const docs = await Creator.find(filter).sort({ name: 1 }).lean();
  return docs
    .map((doc) => serializeCreator(doc, { includePayout: query.includePayout }))
    .filter((creator): creator is NonNullable<typeof creator> => Boolean(creator));
}

export async function loadCreatorHub(
  creatorId: string,
  options: { includePayout?: boolean } = {},
) {
  await connectDB();

  const doc = await Creator.findById(creatorId).lean();
  if (!doc) {
    return null;
  }

  const shootDocs = await Shoot.find({
    creatorId: new mongoose.Types.ObjectId(creatorId),
  })
    .populate(SHOOT_POPULATE)
    .sort({ scheduledAt: 1, createdAt: -1 })
    .lean();

  const shoots = shootDocs
    .map((shoot) => serializeShoot(shoot))
    .filter((shoot): shoot is SerializedShoot => Boolean(shoot));

  const windows = await loadCreatorAvailabilityList(creatorId);

  return {
    creator: serializeCreator(doc, { includePayout: options.includePayout })!,
    shoots,
    windows,
  };
}
