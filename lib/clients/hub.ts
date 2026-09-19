import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { attachLiveProduction } from "@/lib/orders/production";
import { CLIENT_POPULATE } from "@/lib/populate";
import type { AuthOk } from "@/lib/rbac";
import { canManageClientInvites } from "@/lib/roles";
import { decryptPortalPassword } from "@/lib/clients/portal-password";
import {
  ACTIVE_ORDER_STATUSES,
  normalizeClientStatus,
  normalizeOrderStatus,
} from "@/lib/status";
import {
  serializeActivityLog,
  serializeAsset,
  serializeClient,
  serializeOrder,
  serializePayment,
  serializeScript,
  serializeShoot,
  serializeTicket,
  serializeVideo,
  type SerializedActivityLog,
  type SerializedAsset,
  type SerializedClient,
  type SerializedOrder,
  type SerializedPayment,
  type SerializedScript,
  type SerializedShoot,
  type SerializedTicket,
  type SerializedVideo,
} from "@/lib/serialize";
import { ActivityLog } from "@/models/ActivityLog";
import { Asset } from "@/models/Asset";
import { Client } from "@/models/Client";
import { Creator } from "@/models/Creator";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Script } from "@/models/Script";
import { Shoot } from "@/models/Shoot";
import { SupportTicket } from "@/models/SupportTicket";
import { User } from "@/models/User";
import { Video } from "@/models/Video";

void Creator;
void Employee;
void User;

export type CreatorHistoryItem = {
  id: string;
  name: string;
  shootCount: number;
  videoCount: number;
};

export type ClientHub = {
  client: SerializedClient;
  activeOrders: SerializedOrder[];
  orders: SerializedOrder[];
  scripts: SerializedScript[];
  shoots: SerializedShoot[];
  creatorHistory: CreatorHistoryItem[];
  videos: SerializedVideo[];
  invoices: SerializedPayment[];
  tickets: SerializedTicket[];
  assets: SerializedAsset[];
  activityLog: SerializedActivityLog[];
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compact<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => Boolean(item));
}

function serializeClientForAuth(
  doc: Record<string, unknown>,
  auth: AuthOk,
) {
  if (!canManageClientInvites(auth.session.user.role)) {
    return serializeClient(doc);
  }
  return serializeClient(doc, {
    portalPassword: decryptPortalPassword(
      typeof doc.passwordCipher === "string" ? doc.passwordCipher : null,
    ),
  });
}

export async function loadClientList(
  auth: AuthOk,
  query: { q?: string; status?: string } = {},
) {
  await connectDB();

  const filter: Record<string, unknown> =
    auth.session.user.role === "client"
      ? { _id: new mongoose.Types.ObjectId(auth.session.user.clientId!) }
      : auth.session.user.role === "employee" && auth.session.user.allowedClientIds
        ? {
            _id: {
              $in: auth.session.user.allowedClientIds.map(
                (id) => new mongoose.Types.ObjectId(id),
              ),
            },
          }
        : {};

  if (query.status) {
    filter.status = normalizeClientStatus(query.status);
  }

  const search = query.q?.trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { name: rx },
      { companyName: rx },
      { email: rx },
      { brandName: rx },
      { phone: rx },
    ];
  }

  const reveal = canManageClientInvites(auth.session.user.role);
  const listQuery = Client.find(filter);
  if (reveal) {
    listQuery.select("+passwordCipher");
  }
  const docs = await listQuery
    .populate(CLIENT_POPULATE)
    .sort({ createdAt: -1 })
    .lean();

  return compact(docs.map((doc) => serializeClientForAuth(doc, auth)));
}

export async function loadClientHub(
  auth: AuthOk,
  clientId: string,
): Promise<ClientHub | null> {
  await connectDB();

  const objectId = new mongoose.Types.ObjectId(clientId);
  const reveal = canManageClientInvites(auth.session.user.role);
  const clientQuery = Client.findById(clientId);
  if (reveal) {
    clientQuery.select("+passwordCipher");
  }
  const clientDoc = await clientQuery.populate(CLIENT_POPULATE).lean();

  if (!clientDoc) {
    return null;
  }

  const related = auth.byClient({ clientId: objectId });

  const creatorLookup = [
    {
      $lookup: {
        from: "creators",
        localField: "creatorId",
        foreignField: "_id",
        as: "creator",
      },
    },
    { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
  ];

  const [
    orderDocs,
    scriptDocs,
    shootDocs,
    videoDocs,
    paymentDocs,
    ticketDocs,
    assetDocs,
    logDocs,
    creatorHistoryDocs,
  ] = await Promise.all([
    Order.find(related).sort({ createdAt: -1 }).lean(),
    Script.aggregate([{ $match: related }, { $sort: { createdAt: -1 } }, ...creatorLookup]),
    Shoot.aggregate([
      { $match: related },
      { $sort: { scheduledAt: -1, createdAt: -1 } },
      ...creatorLookup,
    ]),
    Video.aggregate([{ $match: related }, { $sort: { createdAt: -1 } }, ...creatorLookup]),
    Payment.find(related).sort({ createdAt: -1 }).lean(),
    SupportTicket.find(related).sort({ createdAt: -1 }).lean(),
    Asset.find(related).sort({ createdAt: -1 }).lean(),
    ActivityLog.aggregate([
      { $match: { entityType: "Client", entityId: objectId } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "users",
          localField: "actorId",
          foreignField: "_id",
          as: "actor",
        },
      },
      { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } },
    ]),
    Shoot.aggregate([
      { $match: related },
      { $project: { creatorId: 1, kind: { $literal: "shoot" } } },
      {
        $unionWith: {
          coll: "videos",
          pipeline: [
            { $match: related },
            { $project: { creatorId: 1, kind: { $literal: "video" } } },
          ],
        },
      },
      { $match: { creatorId: { $ne: null } } },
      {
        $group: {
          _id: "$creatorId",
          shootCount: {
            $sum: { $cond: [{ $eq: ["$kind", "shoot"] }, 1, 0] },
          },
          videoCount: {
            $sum: { $cond: [{ $eq: ["$kind", "video"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "creators",
          localField: "_id",
          foreignField: "_id",
          as: "creator",
        },
      },
      { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          id: { $toString: "$_id" },
          name: { $ifNull: ["$creator.name", "Unknown creator"] },
          shootCount: 1,
          videoCount: 1,
        },
      },
      { $sort: { name: 1 } },
    ]),
  ]);

  const orders = compact(
    (await attachLiveProduction(orderDocs, related)).map((doc) => serializeOrder(doc)),
  );
  const scripts = compact(
    scriptDocs.map((doc) =>
      serializeScript({ ...doc, creatorId: doc.creator ?? doc.creatorId }),
    ),
  );
  const shoots = compact(
    shootDocs.map((doc) =>
      serializeShoot({ ...doc, creatorId: doc.creator ?? doc.creatorId }),
    ),
  );
  const videos = compact(
    videoDocs.map((doc) =>
      serializeVideo({ ...doc, creatorId: doc.creator ?? doc.creatorId }),
    ),
  );
  const invoices = compact(paymentDocs.map((doc) => serializePayment(doc)));
  const tickets = compact(ticketDocs.map((doc) => serializeTicket(doc)));
  const assets = compact(assetDocs.map((doc) => serializeAsset(doc)));
  const activityLog = compact(
    logDocs.map((doc) =>
      serializeActivityLog({ ...doc, actorId: doc.actor ?? doc.actorId }),
    ),
  );
  const creatorHistory = creatorHistoryDocs as CreatorHistoryItem[];

  return {
    client: serializeClientForAuth(clientDoc, auth)!,
    activeOrders: orders.filter((order) =>
      ACTIVE_ORDER_STATUSES.includes(normalizeOrderStatus(order.status)),
    ),
    orders,
    scripts,
    shoots,
    creatorHistory,
    videos,
    invoices,
    tickets,
    assets,
    activityLog,
  };
}
