import { serializePreShootChecklist } from "@/lib/shoots/checklist";
import {
  CLIENT_VISIBLE_VIDEO_STATUSES,
  normalizeClientStatus,
  normalizeCreatorAvailability,
  normalizeOrderStatus,
  normalizeScriptStatus,
  normalizeShootStatus,
  normalizeVideoStatus,
} from "@/lib/status";
import {
  emptyProduction,
  type ProductionCounter,
} from "@/lib/orders/production";

export function canonicalCompanyName(
  raw: Record<string, unknown> | null | undefined,
): string {
  if (!raw) {
    return "";
  }

  const value = raw.companyName ?? raw.company_name ?? raw.company ?? "";
  return String(value).trim();
}

function isPopulated(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && "_id" in (value as object);
}

export function toId(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (isPopulated(value)) {
    return String(value._id);
  }
  return String(value);
}

export function toIso(value: unknown): string | null {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function populatedName(value: unknown): string {
  if (!isPopulated(value)) {
    return "";
  }
  return String(value.name ?? "");
}

function assignedEmployeeFields(value: unknown) {
  if (!value) {
    return { assignedEmployeeId: null, assignedEmployeeName: "" };
  }

  if (!isPopulated(value)) {
    return { assignedEmployeeId: String(value), assignedEmployeeName: "" };
  }

  const userName = populatedName(value.userId);
  const jobTitle = String(value.jobTitle ?? "");

  return {
    assignedEmployeeId: String(value._id),
    assignedEmployeeName: userName || jobTitle,
  };
}

export function serializeClient(
  doc: Record<string, unknown> | null,
  options?: { portalPassword?: string | null },
) {
  if (!doc) {
    return null;
  }

  const assigned = assignedEmployeeFields(doc.assignedEmployeeId);

  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
    companyName: canonicalCompanyName(doc),
    email: String(doc.email ?? ""),
    phone: String(doc.phone ?? ""),
    whatsapp: String(doc.whatsapp ?? ""),
    brandName: String(doc.brandName ?? ""),
    industry: String(doc.industry ?? ""),
    gstTaxId: String(doc.gstTaxId ?? ""),
    assignedEmployeeId: assigned.assignedEmployeeId,
    assignedEmployeeName: assigned.assignedEmployeeName,
    source: String(doc.source ?? ""),
    status: normalizeClientStatus(doc.status),
    notes: String(doc.notes ?? ""),
    passwordSet: Boolean(doc.passwordSet),
    inviteTokenExpiry: toIso(doc.inviteTokenExpiry),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    ...(options && "portalPassword" in options
      ? { portalPassword: options.portalPassword ?? null }
      : {}),
  };
}

function serializeAssignedTeam(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) {
    return { assignedEmployeeIds: [] as string[], assignedTeam: [] as { id: string; name: string }[] };
  }

  const assignedEmployeeIds: string[] = [];
  const assignedTeam: { id: string; name: string }[] = [];

  for (const item of value) {
    if (!item) {
      continue;
    }
    if (typeof item === "object" && "_id" in item) {
      const employee = item as Record<string, unknown>;
      const id = String(employee._id);
      assignedEmployeeIds.push(id);
      const userName = populatedName(employee.userId);
      assignedTeam.push({
        id,
        name: userName || String(employee.jobTitle ?? ""),
      });
      continue;
    }
    assignedEmployeeIds.push(String(item));
  }

  return { assignedEmployeeIds, assignedTeam };
}

export type SerializeAudience = "internal" | "portal";

export function audienceFor(user: { role?: string | null }): SerializeAudience {
  return user.role === "client" ? "portal" : "internal";
}

export function serializeOptions(user: { role?: string | null }) {
  return { audience: audienceFor(user) };
}

export type SerializedOrder = {
  id: string;
  clientId: string | null;
  clientName: string;
  companyName: string;
  packageName: string;
  contractedVideoCount: number;
  status: ReturnType<typeof normalizeOrderStatus>;
  production: ProductionCounter;
  orderedVideos: number;
  assignedVideos: number;
  completedVideos: number;
  deliveredVideos: number;
  remainingQuota: number;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  assignedEmployeeIds: string[];
  assignedTeam: { id: string; name: string }[];
  pricing?: number;
  gstTax?: number;
  totalInvoiceAmount?: number;
  amountReceived?: number;
  outstandingBalance?: number;
};

export function serializeOrder(
  doc: Record<string, unknown> | null,
  options: { audience?: SerializeAudience } = {},
): SerializedOrder | null {
  if (!doc) {
    return null;
  }

  const populatedClient =
    doc.clientId && typeof doc.clientId === "object" && "_id" in (doc.clientId as object)
      ? serializeClient(doc.clientId as Record<string, unknown>)
      : null;

  const contractedVideoCount = Number(doc.contractedVideoCount ?? 0);
  const production =
    doc.production && typeof doc.production === "object"
      ? (doc.production as ProductionCounter)
      : emptyProduction(contractedVideoCount);
  const assigned = serializeAssignedTeam(doc.assignedEmployeeIds);
  const audience = options.audience ?? "internal";

  const shared = {
    id: String(doc._id),
    clientId: populatedClient?.id ?? toId(doc.clientId),
    clientName: populatedClient?.name ?? "",
    companyName: populatedClient?.companyName ?? canonicalCompanyName(doc),
    packageName: String(doc.packageName ?? ""),
    contractedVideoCount,
    status: normalizeOrderStatus(doc.status),
    production,
    orderedVideos: production.ordered,
    assignedVideos: production.assigned,
    completedVideos: production.completed,
    deliveredVideos: production.delivered,
    remainingQuota: production.remaining,
    startDate: toIso(doc.startDate),
    dueDate: toIso(doc.dueDate),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };

  if (audience === "portal") {
    return {
      ...shared,
      assignedEmployeeIds: [] as string[],
      assignedTeam: [] as { id: string; name: string }[],
    };
  }

  return {
    ...shared,
    pricing: Number(doc.pricing ?? 0),
    gstTax: Number(doc.gstTax ?? 0),
    totalInvoiceAmount: Number(doc.totalInvoiceAmount ?? 0),
    amountReceived: Number(doc.amountReceived ?? 0),
    outstandingBalance:
      Number(doc.totalInvoiceAmount ?? 0) - Number(doc.amountReceived ?? 0),
    assignedEmployeeIds: assigned.assignedEmployeeIds,
    assignedTeam: assigned.assignedTeam,
  };
}

export function serializeScript(
  doc: Record<string, unknown> | null,
  options: { audience?: SerializeAudience } = {},
) {
  if (!doc) {
    return null;
  }

  const populatedClient =
    doc.clientId && typeof doc.clientId === "object" && "_id" in (doc.clientId as object)
      ? serializeClient(doc.clientId as Record<string, unknown>)
      : null;

  const populatedOrder =
    doc.orderId && typeof doc.orderId === "object" && "_id" in (doc.orderId as object)
      ? (doc.orderId as Record<string, unknown>)
      : null;

  const writer = assignedEmployeeFields(doc.writerId);
  const audience = options.audience ?? "internal";
  const writerFields =
    audience === "portal"
      ? { writerId: null as string | null, writerName: "" }
      : {
          writerId: writer.assignedEmployeeId,
          writerName: writer.assignedEmployeeName,
        };

  return {
    id: String(doc._id),
    clientId: populatedClient?.id ?? toId(doc.clientId),
    clientName: populatedClient?.name ?? "",
    companyName: populatedClient?.companyName ?? canonicalCompanyName(doc),
    orderId: populatedOrder ? String(populatedOrder._id) : toId(doc.orderId),
    packageName: populatedOrder ? String(populatedOrder.packageName ?? "") : "",
    ...writerFields,
    creatorId: audience === "portal" ? null : toId(doc.creatorId),
    creatorName: audience === "portal" ? "" : populatedName(doc.creatorId),
    videoNumber: Number(doc.videoNumber ?? 1),
    language: String(doc.language ?? ""),
    scriptText: String(doc.scriptText ?? ""),
    referenceLinks: Array.isArray(doc.referenceLinks)
      ? doc.referenceLinks.map((link) => String(link)).filter(Boolean)
      : [],
    deadline: toIso(doc.deadline),
    revisionCount: Number(doc.revisionCount ?? 0),
    comments: serializeScriptComments(doc.comments),
    status: normalizeScriptStatus(doc.status),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function serializeScriptComments(value: unknown) {
  if (!value) {
    return [] as {
      id: string;
      authorId: string | null;
      authorName: string;
      authorRole: string;
      body: string;
      createdAt: string | null;
    }[];
  }

  if (typeof value === "string") {
    const body = value.trim();
    if (!body) {
      return [];
    }
    return [
      {
        id: "legacy",
        authorId: null,
        authorName: "Note",
        authorRole: "",
        body,
        createdAt: null,
      },
    ];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const comment =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      id: comment._id ? String(comment._id) : `comment-${index}`,
      authorId: toId(comment.authorId),
      authorName:
        populatedName(comment.authorId) || String(comment.authorName ?? "Unknown"),
      authorRole: String(comment.authorRole ?? ""),
      body: String(comment.body ?? ""),
      createdAt: toIso(comment.createdAt),
    };
  });
}

function serializeFeedbackLog(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const entry =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      id: entry._id ? String(entry._id) : `feedback-${index}`,
      authorId: toId(entry.authorId),
      authorName:
        populatedName(entry.authorId) || String(entry.authorName ?? "Unknown"),
      authorRole: String(entry.authorRole ?? ""),
      body: String(entry.body ?? ""),
      timecode: String(entry.timecode ?? ""),
      decision: String(entry.decision ?? "Comment"),
      createdAt: toIso(entry.createdAt),
    };
  });
}

export function serializeShoot(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  const populatedClient =
    doc.clientId && typeof doc.clientId === "object" && "_id" in (doc.clientId as object)
      ? serializeClient(doc.clientId as Record<string, unknown>)
      : null;

  const populatedOrder =
    doc.orderId && typeof doc.orderId === "object" && "_id" in (doc.orderId as object)
      ? (doc.orderId as Record<string, unknown>)
      : null;

  const cameraman = assignedEmployeeFields(doc.cameramanId);
  const shootManager = assignedEmployeeFields(doc.shootManagerId);
  const assistant = assignedEmployeeFields(doc.assistantId);

  const approvedScripts = Array.isArray(doc.approvedScriptIds)
    ? doc.approvedScriptIds.map((item) => {
        if (item && typeof item === "object" && "_id" in (item as object)) {
          const script = item as Record<string, unknown>;
          return {
            id: String(script._id),
            videoNumber: Number(script.videoNumber ?? 0),
            status: String(script.status ?? ""),
          };
        }
        return {
          id: String(item),
          videoNumber: 0,
          status: "",
        };
      })
    : [];

  return {
    id: String(doc._id),
    clientId: populatedClient?.id ?? toId(doc.clientId),
    clientName: populatedClient?.name ?? "",
    companyName: populatedClient?.companyName ?? canonicalCompanyName(doc),
    orderId: populatedOrder ? String(populatedOrder._id) : toId(doc.orderId),
    packageName: populatedOrder ? String(populatedOrder.packageName ?? "") : "",
    creatorId: toId(doc.creatorId),
    creatorName: populatedName(doc.creatorId),
    cameramanId: cameraman.assignedEmployeeId,
    cameramanName: cameraman.assignedEmployeeName,
    shootManagerId: shootManager.assignedEmployeeId,
    shootManagerName: shootManager.assignedEmployeeName,
    assistantId: assistant.assignedEmployeeId,
    assistantName: assistant.assignedEmployeeName,
    approvedScriptIds: approvedScripts.map((script) => script.id),
    approvedScripts,
    location: String(doc.location ?? ""),
    scheduledAt: toIso(doc.scheduledAt),
    endsAt: toIso(doc.endsAt),
    status: normalizeShootStatus(doc.status),
    notes: String(doc.notes ?? ""),
    checklist: serializePreShootChecklist(doc.checklist),
    footageUploaded: Boolean(doc.footageUploaded),
    rawIntegrityChecked: Boolean(doc.rawIntegrityChecked),
    reshootRequired: Boolean(doc.reshootRequired),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeVideo(
  doc: Record<string, unknown> | null,
  options: { audience?: SerializeAudience } = {},
) {
  if (!doc) {
    return null;
  }

  const populatedClient =
    doc.clientId && typeof doc.clientId === "object" && "_id" in (doc.clientId as object)
      ? serializeClient(doc.clientId as Record<string, unknown>)
      : null;

  const populatedOrder =
    doc.orderId && typeof doc.orderId === "object" && "_id" in (doc.orderId as object)
      ? (doc.orderId as Record<string, unknown>)
      : null;

  const populatedScript =
    doc.scriptId && typeof doc.scriptId === "object" && "_id" in (doc.scriptId as object)
      ? (doc.scriptId as Record<string, unknown>)
      : null;

  const populatedShoot =
    doc.shootId && typeof doc.shootId === "object" && "_id" in (doc.shootId as object)
      ? (doc.shootId as Record<string, unknown>)
      : null;

  const editor = assignedEmployeeFields(doc.editorId);
  const audience = options.audience ?? "internal";
  const editorFields =
    audience === "portal"
      ? {
          editorId: null as string | null,
          assignedEditorId: null as string | null,
          assignedEditorName: "",
          revisionPriority: false,
        }
      : {
          editorId: editor.assignedEmployeeId,
          assignedEditorId: editor.assignedEmployeeId,
          assignedEditorName: editor.assignedEmployeeName,
          revisionPriority: Boolean(doc.revisionPriority),
        };

  const status = normalizeVideoStatus(doc.status);
  const hideInProgressMedia =
    audience === "portal" && !CLIENT_VISIBLE_VIDEO_STATUSES.includes(status);

  return {
    id: String(doc._id),
    clientId: populatedClient?.id ?? toId(doc.clientId),
    clientName: populatedClient?.name ?? "",
    companyName: populatedClient?.companyName ?? canonicalCompanyName(doc),
    orderId: populatedOrder ? String(populatedOrder._id) : toId(doc.orderId),
    packageName: populatedOrder ? String(populatedOrder.packageName ?? "") : "",
    scriptId: populatedScript ? String(populatedScript._id) : toId(doc.scriptId),
    videoNumber: populatedScript ? Number(populatedScript.videoNumber ?? 0) : 0,
    creatorId: audience === "portal" ? null : toId(doc.creatorId),
    creatorName: audience === "portal" ? "" : populatedName(doc.creatorId),
    shootId: audience === "portal" ? null : populatedShoot ? String(populatedShoot._id) : toId(doc.shootId),
    shootLocation:
      audience === "portal"
        ? ""
        : populatedShoot
          ? String(populatedShoot.location ?? "")
          : "",
    ...editorFields,
    status,
    fileLink: hideInProgressMedia ? "" : String(doc.fileLink ?? ""),
    thumbnailUrl: hideInProgressMedia ? "" : String(doc.thumbnailUrl ?? ""),
    finalDeliveryLink: String(doc.finalDeliveryLink ?? ""),
    revisionCount: Number(doc.revisionCount ?? 0),
    revisionRequestedAt:
      audience === "portal" ? null : toIso(doc.revisionRequestedAt),
    deadline: toIso(doc.deadline),
    feedbackLog: serializeFeedbackLog(doc.feedbackLog),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializePayment(
  doc: Record<string, unknown> | null,
  options: { audience?: SerializeAudience } = {},
) {
  if (!doc) {
    return null;
  }

  const invoiceAmount = Number(doc.invoiceAmount ?? 0);
  const amountReceived = Number(doc.amountReceived ?? 0);
  const populatedClient =
    doc.clientId && typeof doc.clientId === "object" && "_id" in (doc.clientId as object)
      ? serializeClient(doc.clientId as Record<string, unknown>)
      : null;
  const populatedOrder =
    doc.orderId && typeof doc.orderId === "object" && "_id" in (doc.orderId as object)
      ? (doc.orderId as Record<string, unknown>)
      : null;

  return {
    id: String(doc._id),
    clientId: populatedClient?.id ?? toId(doc.clientId),
    clientName: populatedClient?.name ?? "",
    companyName: populatedClient?.companyName ?? "",
    orderId: populatedOrder ? String(populatedOrder._id) : toId(doc.orderId),
    packageName: populatedOrder ? String(populatedOrder.packageName ?? "") : "",
    invoiceAmount,
    amountReceived,
    pendingBalance: invoiceAmount - amountReceived,
    paymentDate: toIso(doc.paymentDate),
    method: String(doc.method ?? ""),
    transactionRef: String(doc.transactionRef ?? ""),
    notes: options.audience === "portal" ? "" : String(doc.notes ?? ""),
    status: String(doc.status ?? "Unpaid"),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeExpense(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    category: String(doc.category ?? ""),
    amount: Number(doc.amount ?? 0),
    userId: toId(doc.userId),
    userName: populatedName(doc.userId),
    date: toIso(doc.date),
    receiptUrl: String(doc.receiptUrl ?? ""),
    notes: String(doc.notes ?? ""),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

function relatedLabelFor(type: string | null, value: unknown) {
  if (!type || !isPopulated(value)) {
    return "";
  }
  if (type === "Client") {
    return canonicalCompanyName(value) || String(value.name ?? "");
  }
  if (type === "Order") {
    return String(value.packageName ?? "Order");
  }
  if (type === "Script") {
    return value.videoNumber ? `Script #${value.videoNumber}` : "Script";
  }
  return String(value.packageName ?? value.name ?? "Video");
}

export function serializeTask(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  const related = (doc.relatedTo ?? null) as
    | { type?: unknown; id?: unknown }
    | null;
  const relatedType = related?.type ? String(related.type) : null;
  const relatedDoc = related?.id;
  const relatedId = toId(relatedDoc);

  return {
    id: String(doc._id),
    title: String(doc.title ?? ""),
    description: String(doc.description ?? ""),
    assigneeId: toId(doc.assigneeId),
    assigneeName: populatedName(doc.assigneeId),
    createdById: toId(doc.createdById),
    createdByName: populatedName(doc.createdById),
    clientId: toId(doc.clientId),
    relatedTo: relatedType && relatedId ? { type: relatedType, id: relatedId } : null,
    relatedLabel: relatedLabelFor(relatedType, relatedDoc),
    relatedHref:
      relatedType && relatedId
        ? relatedType === "Order"
          ? `/orders/${relatedId}`
          : relatedType === "Client"
            ? `/clients/${relatedId}`
            : relatedType === "Script"
              ? `/scripts/${relatedId}`
              : `/videos/${relatedId}`
        : "",
    priority: String(doc.priority ?? "Medium"),
    status: String(doc.status ?? "To Do"),
    deadline: toIso(doc.deadline),
    attachments: Array.isArray(doc.attachments)
      ? doc.attachments.map((item) => String(item)).filter(Boolean)
      : [],
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializePayout(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  const populatedOrder =
    doc.orderId && typeof doc.orderId === "object" && "_id" in (doc.orderId as object)
      ? (doc.orderId as Record<string, unknown>)
      : null;
  const populatedVideo =
    doc.videoId && typeof doc.videoId === "object" && "_id" in (doc.videoId as object)
      ? (doc.videoId as Record<string, unknown>)
      : null;

  return {
    id: String(doc._id),
    creatorId: toId(doc.creatorId),
    creatorName: populatedName(doc.creatorId),
    orderId: populatedOrder ? String(populatedOrder._id) : toId(doc.orderId),
    packageName: populatedOrder ? String(populatedOrder.packageName ?? "") : "",
    videoId: populatedVideo ? String(populatedVideo._id) : toId(doc.videoId),
    videoCount: Number(doc.videoCount ?? 1),
    contractedRate: Number(doc.contractedRate ?? 0),
    totalPayout: Number(doc.totalPayout ?? 0),
    paymentDate: toIso(doc.paymentDate),
    reference: String(doc.reference ?? ""),
    status: String(doc.status ?? "Pending"),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeTicket(
  doc: Record<string, unknown> | null,
  options: { audience?: SerializeAudience } = {},
) {
  if (!doc) {
    return null;
  }

  const assigned = assignedEmployeeFields(doc.assignedEmployeeId);
  const populatedClient =
    doc.clientId && typeof doc.clientId === "object" && "_id" in (doc.clientId as object)
      ? serializeClient(doc.clientId as Record<string, unknown>)
      : null;
  const populatedOrder =
    doc.orderId && typeof doc.orderId === "object" && "_id" in (doc.orderId as object)
      ? (doc.orderId as Record<string, unknown>)
      : null;

  return {
    id: String(doc._id),
    clientId: populatedClient?.id ?? toId(doc.clientId),
    companyName: populatedClient?.companyName ?? canonicalCompanyName(doc),
    orderId: populatedOrder ? String(populatedOrder._id) : toId(doc.orderId),
    packageName: populatedOrder ? String(populatedOrder.packageName ?? "") : "",
    subject: String(doc.subject ?? ""),
    body: String(doc.body ?? ""),
    status: String(doc.status ?? "Open"),
    assignedEmployeeId:
      options.audience === "portal" ? null : assigned.assignedEmployeeId,
    assignedEmployeeName:
      options.audience === "portal" ? "" : assigned.assignedEmployeeName,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeAsset(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    clientId: toId(doc.clientId),
    uploadedById: toId(doc.uploadedById),
    name: String(doc.name ?? ""),
    kind: String(doc.kind ?? "Other"),
    url: String(doc.url ?? ""),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeActivityLog(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    actorId: toId(doc.actorId),
    actorName: populatedName(doc.actorId) || "System",
    action: String(doc.action ?? ""),
    entityType: String(doc.entityType ?? ""),
    entityId: toId(doc.entityId),
    metadata:
      doc.metadata && typeof doc.metadata === "object"
        ? (doc.metadata as Record<string, unknown>)
        : {},
    createdAt: toIso(doc.createdAt),
  };
}

export function serializeCreator(
  doc: Record<string, unknown> | null,
  options: { includePayout?: boolean } = {},
) {
  if (!doc) {
    return null;
  }

  const includePayout = Boolean(options.includePayout);

  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
    photoUrl: String(doc.photoUrl ?? ""),
    gender: String(doc.gender ?? ""),
    ageGroup: String(doc.ageGroup ?? ""),
    languages: Array.isArray(doc.languages)
      ? doc.languages.map((item) => String(item)).filter(Boolean)
      : [],
    location: String(doc.location ?? ""),
    niches: Array.isArray(doc.niches)
      ? doc.niches.map((item) => String(item)).filter(Boolean)
      : [],
    demographics: String(doc.demographics ?? ""),
    email: String(doc.email ?? ""),
    phone: String(doc.phone ?? ""),
    rate: Number(doc.rate ?? 0),
    bankAccountName: includePayout ? String(doc.bankAccountName ?? "") : "",
    bankAccountNumber: includePayout ? String(doc.bankAccountNumber ?? "") : "",
    upiId: includePayout ? String(doc.upiId ?? "") : "",
    portfolioLinks: Array.isArray(doc.portfolioLinks)
      ? doc.portfolioLinks.map((item) => String(item)).filter(Boolean)
      : [],
    availability: normalizeCreatorAvailability(doc.availability),
    isActive: Boolean(doc.isActive ?? true),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeEmployee(
  doc: Record<string, unknown> | null,
  options: { includeCompensation?: boolean } = {},
) {
  if (!doc) {
    return null;
  }

  const user = isPopulated(doc.userId) ? doc.userId : null;
  const includeCompensation = Boolean(options.includeCompensation);

  return {
    id: String(doc._id),
    userId: toId(doc.userId),
    name: user ? String(user.name ?? "") : "",
    email: user ? String(user.email ?? "") : "",
    role: user ? String(user.role ?? "employee") : "employee",
    employeeSubRole: user
      ? ((user.employeeSubRole as string | null | undefined) ?? null)
      : null,
    jobTitle: String(doc.jobTitle ?? ""),
    department: String(doc.department ?? ""),
    phone: String(doc.phone ?? ""),
    salary: includeCompensation ? Number(doc.salary ?? 0) : null,
    joiningDate: includeCompensation ? toIso(doc.joiningDate) : null,
    isActive: Boolean(doc.isActive ?? true),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeUser(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    name: String(doc.name ?? ""),
    email: String(doc.email ?? ""),
    role: String(doc.role ?? "employee"),
    employeeSubRole: (doc.employeeSubRole as string | null | undefined) ?? null,
    clientId: toId(doc.clientId),
    permissions: Array.isArray(doc.permissions)
      ? doc.permissions.map((item) => String(item))
      : [],
    isActive: Boolean(doc.isActive ?? true),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export function serializeCreatorAvailability(doc: Record<string, unknown> | null) {
  if (!doc) {
    return null;
  }

  return {
    id: String(doc._id),
    creatorId: toId(doc.creatorId),
    shootId: toId(doc.shootId),
    startsAt: toIso(doc.startsAt),
    endsAt: toIso(doc.endsAt),
    status: normalizeCreatorAvailability(doc.status),
    notes: String(doc.notes ?? ""),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  };
}

export type SerializedClient = NonNullable<ReturnType<typeof serializeClient>>;
export type SerializedScript = NonNullable<ReturnType<typeof serializeScript>>;
export type SerializedShoot = NonNullable<ReturnType<typeof serializeShoot>>;
export type SerializedVideo = NonNullable<ReturnType<typeof serializeVideo>>;
export type SerializedPayment = NonNullable<ReturnType<typeof serializePayment>>;
export type SerializedExpense = NonNullable<ReturnType<typeof serializeExpense>>;
export type SerializedTask = NonNullable<ReturnType<typeof serializeTask>>;
export type SerializedPayout = NonNullable<ReturnType<typeof serializePayout>>;
export type SerializedTicket = NonNullable<ReturnType<typeof serializeTicket>>;
export type SerializedAsset = NonNullable<ReturnType<typeof serializeAsset>>;
export type SerializedActivityLog = NonNullable<
  ReturnType<typeof serializeActivityLog>
>;
export type SerializedEmployee = NonNullable<ReturnType<typeof serializeEmployee>>;
export type SerializedUser = NonNullable<ReturnType<typeof serializeUser>>;
export type SerializedCreatorAvailability = NonNullable<
  ReturnType<typeof serializeCreatorAvailability>
>;
export type SerializedCreator = NonNullable<ReturnType<typeof serializeCreator>>;
