import { Client } from "@/models/Client";
import { emitNotification } from "./emit";
import { internalHref } from "./hrefs";
import {
  clientUserIds,
  mergeUserIds,
  staffUserIds,
  userIdsFromEmployees,
} from "./recipients";

function dayKey(value: Date = new Date()) {
  return value.toISOString().slice(0, 10);
}

function videoLabel(input: { videoNumber?: number | null; packageName?: string | null }) {
  if (input.videoNumber) {
    return `Video #${input.videoNumber}`;
  }
  return input.packageName?.trim() || "a video";
}

export async function notifyClientOnboarded(input: {
  clientId: string;
  companyName: string;
  assignedEmployeeId?: string | null;
  actorId?: string | null;
}) {
  const [staff, assigned] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([input.assignedEmployeeId]),
  ]);

  await emitNotification({
    type: "New Client Onboarding",
    title: "New client onboarded",
    body: `${input.companyName} was added to Leadyfy OS.`,
    entityType: "Client",
    entityId: input.clientId,
    clientId: input.clientId,
    href: internalHref("Client", input.clientId),
    userIds: await mergeUserIds(staff, assigned),
    excludeUserId: input.actorId,
    dedupeKey: `client-onboarded:${input.clientId}`,
  });
}

export async function notifyScriptAssigned(input: {
  scriptId: string;
  clientId: string;
  writerId?: string | null;
  videoNumber?: number | null;
  actorId?: string | null;
}) {
  if (!input.writerId) {
    return;
  }

  const writers = await userIdsFromEmployees([input.writerId]);
  await emitNotification({
    type: "Script Assigned",
    title: "Script assigned",
    body: `${videoLabel(input)} was assigned to you.`,
    entityType: "Script",
    entityId: input.scriptId,
    clientId: input.clientId,
    href: internalHref("Script", input.scriptId),
    userIds: writers,
    excludeUserId: input.actorId,
    dedupeKey: `script-assigned:${input.scriptId}:${input.writerId}`,
  });
}

export async function notifyScriptApproved(input: {
  scriptId: string;
  clientId: string;
  writerId?: string | null;
  videoNumber?: number | null;
  actorId?: string | null;
}) {
  const [staff, writers] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([input.writerId]),
  ]);

  await emitNotification({
    type: "Script Approved",
    title: "Script approved",
    body: `${videoLabel(input)} was approved by the client.`,
    entityType: "Script",
    entityId: input.scriptId,
    clientId: input.clientId,
    href: internalHref("Script", input.scriptId),
    userIds: await mergeUserIds(staff, writers),
    excludeUserId: input.actorId,
    dedupeKey: `script-approved:${input.scriptId}`,
  });
}

export async function notifyScriptRevision(input: {
  scriptId: string;
  clientId: string;
  writerId?: string | null;
  videoNumber?: number | null;
  actorId?: string | null;
}) {
  const writers = await userIdsFromEmployees([input.writerId]);
  await emitNotification({
    type: "Script Revision",
    title: "Script revision requested",
    body: `${videoLabel(input)} needs a revision.`,
    entityType: "Script",
    entityId: input.scriptId,
    clientId: input.clientId,
    href: internalHref("Script", input.scriptId),
    userIds: writers,
    excludeUserId: input.actorId,
    dedupeKey: `script-revision:${input.scriptId}:${dayKey()}`,
  });
}

export async function notifyShootReminder(input: {
  shootId: string;
  clientId: string;
  location?: string | null;
  scheduledAt?: Date | string | null;
  shootManagerId?: string | null;
  cameramanId?: string | null;
  assistantId?: string | null;
}) {
  const [staff, crew] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([
      input.shootManagerId,
      input.cameramanId,
      input.assistantId,
    ]),
  ]);

  const when = input.scheduledAt
    ? new Date(input.scheduledAt).toISOString().slice(0, 16).replace("T", " ")
    : "soon";

  await emitNotification({
    type: "Shoot Reminder",
    title: "Shoot reminder",
    body: `Shoot at ${input.location?.trim() || "the booked location"} is scheduled for ${when}.`,
    entityType: "Shoot",
    entityId: input.shootId,
    clientId: input.clientId,
    href: internalHref("Shoot", input.shootId),
    userIds: await mergeUserIds(staff, crew),
    dedupeKey: `shoot-reminder:${input.shootId}:${dayKey()}`,
  });
}

export async function notifyVideoAssignedToEditor(input: {
  videoId: string;
  clientId: string;
  editorId?: string | null;
  packageName?: string | null;
  actorId?: string | null;
}) {
  if (!input.editorId) {
    return;
  }

  const editors = await userIdsFromEmployees([input.editorId]);
  await emitNotification({
    type: "Video Assigned to Editor",
    title: "Video assigned to editor",
    body: `${input.packageName?.trim() || "A video"} was assigned to you.`,
    entityType: "Video",
    entityId: input.videoId,
    clientId: input.clientId,
    href: internalHref("Video", input.videoId),
    userIds: editors,
    excludeUserId: input.actorId,
    dedupeKey: `video-editor:${input.videoId}:${input.editorId}`,
  });
}

export async function notifyApproachingDeadline(input: {
  entityType: "Video" | "Script";
  entityId: string;
  clientId: string;
  deadline: Date | string;
  assigneeEmployeeId?: string | null;
  label?: string | null;
}) {
  const [staff, assignees] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([input.assigneeEmployeeId]),
  ]);
  const deadline = new Date(input.deadline).toISOString().slice(0, 10);

  await emitNotification({
    type: "Approaching Deadline",
    title: "Approaching deadline",
    body: `${input.label?.trim() || input.entityType} is due ${deadline}.`,
    entityType: input.entityType,
    entityId: input.entityId,
    clientId: input.clientId,
    href: internalHref(input.entityType, input.entityId),
    userIds: await mergeUserIds(staff, assignees),
    dedupeKey: `deadline:${input.entityType}:${input.entityId}:${deadline}`,
  });
}

export async function notifyClientFeedbackPosted(input: {
  videoId: string;
  clientId: string;
  editorId?: string | null;
  packageName?: string | null;
  actorId?: string | null;
}) {
  const [staff, editors] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([input.editorId]),
  ]);

  await emitNotification({
    type: "Client Feedback Posted",
    title: "Client feedback posted",
    body: `New feedback on ${input.packageName?.trim() || "a video"}.`,
    entityType: "Video",
    entityId: input.videoId,
    clientId: input.clientId,
    href: internalHref("Video", input.videoId),
    userIds: await mergeUserIds(staff, editors),
    excludeUserId: input.actorId,
    dedupeKey: `feedback:${input.videoId}:${Date.now()}`,
  });
}

export async function notifyFinalVideoApproved(input: {
  videoId: string;
  clientId: string;
  editorId?: string | null;
  packageName?: string | null;
  actorId?: string | null;
}) {
  const [staff, editors, clients] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([input.editorId]),
    clientUserIds(input.clientId),
  ]);

  await emitNotification({
    type: "Final Video Approved",
    title: "Final video approved",
    body: `${input.packageName?.trim() || "A video"} was approved for delivery.`,
    entityType: "Video",
    entityId: input.videoId,
    clientId: input.clientId,
    href: internalHref("Video", input.videoId),
    userIds: await mergeUserIds(staff, editors, clients),
    excludeUserId: input.actorId,
    dedupeKey: `final-approved:${input.videoId}`,
  });
}

async function clientNotifyFields(clientId: string) {
  const client = await Client.findById(clientId)
    .select("companyName assignedEmployeeId")
    .lean();
  return {
    companyName: client?.companyName ?? "",
    assignedEmployeeId: client?.assignedEmployeeId
      ? String(client.assignedEmployeeId)
      : null,
  };
}

export async function notifyPaymentRecorded(input: {
  paymentId: string;
  clientId: string;
  companyName?: string | null;
  amountReceived: number;
  assignedEmployeeId?: string | null;
  actorId?: string | null;
}) {
  const fallback = await clientNotifyFields(input.clientId);
  const [staff, assigned] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([
      input.assignedEmployeeId ?? fallback.assignedEmployeeId,
    ]),
  ]);
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(input.amountReceived);

  await emitNotification({
    type: "Payment Recorded",
    title: "Payment recorded",
    body: `${amount} recorded for ${input.companyName?.trim() || fallback.companyName || "a client"}.`,
    entityType: "Payment",
    entityId: input.paymentId,
    clientId: input.clientId,
    href: internalHref("Payment", input.paymentId),
    userIds: await mergeUserIds(staff, assigned),
    excludeUserId: input.actorId,
    dedupeKey: `payment-recorded:${input.paymentId}:${input.amountReceived}`,
  });
}

export async function notifyOverdueInvoice(input: {
  paymentId: string;
  clientId: string;
  companyName?: string | null;
  pendingBalance: number;
  assignedEmployeeId?: string | null;
}) {
  const [staff, assigned] = await Promise.all([
    staffUserIds(),
    userIdsFromEmployees([input.assignedEmployeeId]),
  ]);
  const amount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(input.pendingBalance);

  await emitNotification({
    type: "Overdue Invoice",
    title: "Overdue invoice",
    body: `${input.companyName?.trim() || "A client"} has ${amount} overdue.`,
    entityType: "Payment",
    entityId: input.paymentId,
    clientId: input.clientId,
    href: internalHref("Payment", input.paymentId),
    userIds: await mergeUserIds(staff, assigned),
    dedupeKey: `overdue:${input.paymentId}`,
  });
}
