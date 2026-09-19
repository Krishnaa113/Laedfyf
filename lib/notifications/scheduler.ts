import { connectDB } from "@/lib/db";
import { normalizeShootStatus, normalizeVideoStatus } from "@/lib/status";
import { Client } from "@/models/Client";
import { Payment } from "@/models/Payment";
import { Script } from "@/models/Script";
import { Shoot } from "@/models/Shoot";
import { Video } from "@/models/Video";
import {
  notifyApproachingDeadline,
  notifyOverdueInvoice,
  notifyShootReminder,
} from "./triggers";

const DISPATCH_INTERVAL_MS = 10 * 60 * 1000;
let lastDispatchAt = 0;
let dispatchInFlight: Promise<{ ran: boolean }> | null = null;

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function dispatchShootReminders() {
  const until = hoursFromNow(24);
  const shoots = await Shoot.find({
    scheduledAt: { $gte: new Date(), $lte: until },
    status: { $nin: ["Cancelled", "Completed"] },
  }).lean();

  for (const shoot of shoots) {
    if (["Cancelled", "Completed"].includes(normalizeShootStatus(shoot.status))) {
      continue;
    }
    await notifyShootReminder({
      shootId: String(shoot._id),
      clientId: String(shoot.clientId),
      location: shoot.location,
      scheduledAt: shoot.scheduledAt,
      shootManagerId: shoot.shootManagerId ? String(shoot.shootManagerId) : null,
      cameramanId: shoot.cameramanId ? String(shoot.cameramanId) : null,
      assistantId: shoot.assistantId ? String(shoot.assistantId) : null,
    });
  }

  return shoots.length;
}

async function dispatchApproachingDeadlines() {
  const until = hoursFromNow(48);
  const now = new Date();
  const videos = await Video.find({
    deadline: { $gte: now, $lte: until },
    status: { $nin: ["Final Approved", "Delivered"] },
  }).lean();

  for (const video of videos) {
    if (["Final Approved", "Delivered"].includes(normalizeVideoStatus(video.status))) {
      continue;
    }
    await notifyApproachingDeadline({
      entityType: "Video",
      entityId: String(video._id),
      clientId: String(video.clientId),
      deadline: video.deadline as Date,
      assigneeEmployeeId: video.editorId ? String(video.editorId) : null,
      label: "A video edit",
    });
  }

  const scripts = await Script.find({
    deadline: { $gte: now, $lte: until },
    status: { $nin: ["Approved", "Ready for Shoot"] },
  }).lean();

  for (const script of scripts) {
    await notifyApproachingDeadline({
      entityType: "Script",
      entityId: String(script._id),
      clientId: String(script.clientId),
      deadline: script.deadline as Date,
      assigneeEmployeeId: script.writerId ? String(script.writerId) : null,
      label: script.videoNumber ? `Script #${script.videoNumber}` : "A script",
    });
  }

  return videos.length + scripts.length;
}

async function dispatchOverdueInvoices() {
  const payments = await Payment.find({ status: "Overdue" }).lean();
  const clientIds = [
    ...new Set(payments.map((payment) => String(payment.clientId)).filter(Boolean)),
  ];
  const clients = clientIds.length
    ? await Client.find({ _id: { $in: clientIds } })
        .select("companyName assignedEmployeeId")
        .lean()
    : [];
  const clientById = new Map(clients.map((client) => [String(client._id), client]));

  for (const payment of payments) {
    const client = clientById.get(String(payment.clientId));
    const pending = Math.max(
      0,
      Number(payment.invoiceAmount ?? 0) - Number(payment.amountReceived ?? 0),
    );
    await notifyOverdueInvoice({
      paymentId: String(payment._id),
      clientId: String(payment.clientId),
      companyName: client?.companyName ?? "",
      pendingBalance: pending,
      assignedEmployeeId: client?.assignedEmployeeId
        ? String(client.assignedEmployeeId)
        : null,
    });
  }

  return payments.length;
}

export async function dispatchDueNotifications(options: { force?: boolean } = {}) {
  const now = Date.now();
  if (!options.force && now - lastDispatchAt < DISPATCH_INTERVAL_MS) {
    return { ran: false as const };
  }
  if (dispatchInFlight) {
    return dispatchInFlight;
  }

  dispatchInFlight = (async () => {
    await connectDB();
    lastDispatchAt = Date.now();
    await Promise.all([
      dispatchShootReminders(),
      dispatchApproachingDeadlines(),
      dispatchOverdueInvoices(),
    ]);
    return { ran: true as const };
  })().finally(() => {
    dispatchInFlight = null;
  });

  return dispatchInFlight;
}

export function resetNotificationDispatchClock() {
  lastDispatchAt = 0;
}
