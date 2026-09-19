export const CLIENT_STATUSES = [
  "Lead",
  "New",
  "Onboarding",
  "Active",
  "On Hold",
  "Completed",
  "Inactive",
] as const;

export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  Lead: "Lead",
  New: "New",
  Onboarding: "Onboarding",
  Active: "Active",
  "On Hold": "On Hold",
  Completed: "Completed",
  Inactive: "Inactive",
};

const CLIENT_STATUS_ALIASES: Record<string, ClientStatus> = {
  lead: "Lead",
  Lead: "Lead",
  new: "New",
  New: "New",
  onboarding: "Onboarding",
  Onboarding: "Onboarding",
  active: "Active",
  Active: "Active",
  on_hold: "On Hold",
  "On Hold": "On Hold",
  completed: "Completed",
  Completed: "Completed",
  inactive: "Inactive",
  Inactive: "Inactive",
};

export function normalizeClientStatus(value: unknown): ClientStatus {
  return CLIENT_STATUS_ALIASES[String(value)] ?? "Lead";
}

export const ORDER_STATUSES = [
  "New",
  "Onboarding",
  "In Production",
  "Partially Delivered",
  "Completed",
  "On Hold",
  "Cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  New: "New",
  Onboarding: "Onboarding",
  "In Production": "In Production",
  "Partially Delivered": "Partially Delivered",
  Completed: "Completed",
  "On Hold": "On Hold",
  Cancelled: "Cancelled",
};

const ORDER_STATUS_ALIASES: Record<string, OrderStatus> = {
  new: "New",
  New: "New",
  onboarding: "Onboarding",
  Onboarding: "Onboarding",
  in_production: "In Production",
  "In Production": "In Production",
  partially_delivered: "Partially Delivered",
  "Partially Delivered": "Partially Delivered",
  completed: "Completed",
  Completed: "Completed",
  on_hold: "On Hold",
  "On Hold": "On Hold",
  cancelled: "Cancelled",
  Cancelled: "Cancelled",
};

export function normalizeOrderStatus(value: unknown): OrderStatus {
  return ORDER_STATUS_ALIASES[String(value)] ?? "New";
}

export const SCRIPT_STATUSES = [
  "Draft",
  "Assigned",
  "In Review",
  "Sent to Client",
  "Revision Required",
  "Approved",
  "Ready for Shoot",
] as const;

export type ScriptStatus = (typeof SCRIPT_STATUSES)[number];

const SCRIPT_STATUS_ALIASES: Record<string, ScriptStatus> = {
  draft: "Draft",
  Draft: "Draft",
  assigned: "Assigned",
  Assigned: "Assigned",
  in_review: "In Review",
  "In Review": "In Review",
  sent_to_client: "Sent to Client",
  "Sent to Client": "Sent to Client",
  revision_required: "Revision Required",
  "Revision Required": "Revision Required",
  approved: "Approved",
  Approved: "Approved",
  ready_for_shoot: "Ready for Shoot",
  "Ready for Shoot": "Ready for Shoot",
};

export function normalizeScriptStatus(value: unknown): ScriptStatus {
  return SCRIPT_STATUS_ALIASES[String(value)] ?? "Draft";
}

export const SCRIPT_STATUS_LABELS: Record<ScriptStatus, string> = {
  Draft: "Draft",
  Assigned: "Assigned",
  "In Review": "In Review",
  "Sent to Client": "Sent to Client",
  "Revision Required": "Revision Required",
  Approved: "Approved",
  "Ready for Shoot": "Ready for Shoot",
};

export const CLIENT_VISIBLE_SCRIPT_STATUSES: ScriptStatus[] = [
  "Sent to Client",
  "Revision Required",
  "Approved",
  "Ready for Shoot",
];

export const SHOOT_STATUSES = [
  "Scheduled",
  "Confirmed",
  "In Progress",
  "Completed",
  "Cancelled",
  "Reshoot Required",
] as const;

export type ShootStatus = (typeof SHOOT_STATUSES)[number];

const SHOOT_STATUS_ALIASES: Record<string, ShootStatus> = {
  scheduled: "Scheduled",
  Scheduled: "Scheduled",
  confirmed: "Confirmed",
  Confirmed: "Confirmed",
  in_progress: "In Progress",
  "In Progress": "In Progress",
  completed: "Completed",
  Completed: "Completed",
  cancelled: "Cancelled",
  Cancelled: "Cancelled",
  reshoot_required: "Reshoot Required",
  "Reshoot Required": "Reshoot Required",
};

export function normalizeShootStatus(value: unknown): ShootStatus {
  return SHOOT_STATUS_ALIASES[String(value)] ?? "Scheduled";
}

export const VIDEO_STATUSES = [
  "Script Approved",
  "Shoot Pending",
  "Raw Footage Received",
  "Video Editing",
  "Internal QA",
  "Client Review",
  "Revision",
  "Final Approved",
  "Delivered",
] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number];

const VIDEO_STATUS_ALIASES: Record<string, VideoStatus> = {
  script_approved: "Script Approved",
  "Script Approved": "Script Approved",
  shoot_pending: "Shoot Pending",
  "Shoot Pending": "Shoot Pending",
  raw_footage_received: "Raw Footage Received",
  "Raw Footage Received": "Raw Footage Received",
  video_editing: "Video Editing",
  "Video Editing": "Video Editing",
  internal_qa: "Internal QA",
  "Internal QA": "Internal QA",
  client_review: "Client Review",
  "Client Review": "Client Review",
  revision: "Revision",
  Revision: "Revision",
  final_approved: "Final Approved",
  "Final Approved": "Final Approved",
  delivered: "Delivered",
  Delivered: "Delivered",
};

export function normalizeVideoStatus(value: unknown): VideoStatus {
  return VIDEO_STATUS_ALIASES[String(value)] ?? "Script Approved";
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  "Script Approved": "Script Approved",
  "Shoot Pending": "Shoot Pending",
  "Raw Footage Received": "Raw Footage Received",
  "Video Editing": "Video Editing",
  "Internal QA": "Internal QA",
  "Client Review": "Client Review",
  Revision: "Revision",
  "Final Approved": "Final Approved",
  Delivered: "Delivered",
};

export const CLIENT_VISIBLE_VIDEO_STATUSES: VideoStatus[] = [
  "Client Review",
  "Revision",
  "Final Approved",
  "Delivered",
];

export const VIDEO_COMPLETED_STATUSES: VideoStatus[] = [
  "Final Approved",
  "Delivered",
];

export const CREATOR_AVAILABILITY_STATUSES = [
  "Available",
  "Booked",
  "Unavailable",
  "On Hold",
] as const;

export type CreatorAvailabilityStatus =
  (typeof CREATOR_AVAILABILITY_STATUSES)[number];

export const CREATOR_AVAILABILITY_LABELS: Record<
  CreatorAvailabilityStatus,
  string
> = {
  Available: "Available",
  Booked: "Booked",
  Unavailable: "Unavailable",
  "On Hold": "On Hold",
};

const CREATOR_AVAILABILITY_ALIASES: Record<string, CreatorAvailabilityStatus> = {
  available: "Available",
  Available: "Available",
  booked: "Booked",
  Booked: "Booked",
  unavailable: "Unavailable",
  Unavailable: "Unavailable",
  on_hold: "On Hold",
  "On Hold": "On Hold",
};

export function normalizeCreatorAvailability(
  value: unknown,
): CreatorAvailabilityStatus {
  return CREATOR_AVAILABILITY_ALIASES[String(value)] ?? "Available";
}

export const SHOOT_STATUS_LABELS: Record<ShootStatus, string> = {
  Scheduled: "Scheduled",
  Confirmed: "Confirmed",
  "In Progress": "In Progress",
  Completed: "Completed",
  Cancelled: "Cancelled",
  "Reshoot Required": "Reshoot Required",
};

export const TASK_STATUSES = ["To Do", "In Progress", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  "To Do": "To Do",
  "In Progress": "In Progress",
  Done: "Done",
};

const TASK_STATUS_ALIASES: Record<string, TaskStatus> = {
  todo: "To Do",
  "to do": "To Do",
  "To Do": "To Do",
  in_progress: "In Progress",
  "in progress": "In Progress",
  "In Progress": "In Progress",
  done: "Done",
  Done: "Done",
};

export function normalizeTaskStatus(value: unknown): TaskStatus {
  return TASK_STATUS_ALIASES[String(value)] ?? "To Do";
}

export const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  Urgent: "Urgent",
  High: "High",
  Medium: "Med",
  Low: "Low",
};

const TASK_PRIORITY_ALIASES: Record<string, TaskPriority> = {
  urgent: "Urgent",
  Urgent: "Urgent",
  high: "High",
  High: "High",
  medium: "Medium",
  Medium: "Medium",
  med: "Medium",
  Med: "Medium",
  low: "Low",
  Low: "Low",
};

export function normalizeTaskPriority(value: unknown): TaskPriority {
  return TASK_PRIORITY_ALIASES[String(value)] ?? "Medium";
}

export const TASK_RELATED_TYPES = ["Client", "Order", "Script", "Video"] as const;
export type TaskRelatedType = (typeof TASK_RELATED_TYPES)[number];

export const PAYMENT_STATUSES = [
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Overdue",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "Salaries",
  "Office",
  "Studio",
  "Equipment",
  "Fuel",
  "Payouts",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYOUT_STATUSES = ["Pending", "Approved", "Paid"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const TICKET_STATUSES = ["Open", "In Progress", "Resolved"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  Open: "Open",
  "In Progress": "In Progress",
  Resolved: "Resolved",
};

export function normalizeTicketStatus(value: unknown): TicketStatus {
  const match = TICKET_STATUSES.find((status) => status === value);
  return match ?? "Open";
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  Unpaid: "Unpaid",
  "Partially Paid": "Partially Paid",
  Paid: "Paid",
  Overdue: "Overdue",
};

export function normalizePaymentStatus(value: unknown): PaymentStatus {
  const match = PAYMENT_STATUSES.find((status) => status === value);
  return match ?? "Unpaid";
}

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  Pending: "Pending",
  Approved: "Approved",
  Paid: "Paid",
};

export function normalizePayoutStatus(value: unknown): PayoutStatus {
  const match = PAYOUT_STATUSES.find((status) => status === value);
  return match ?? "Pending";
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  Salaries: "Salaries",
  Office: "Office",
  Studio: "Studio",
  Equipment: "Equipment",
  Fuel: "Fuel",
  Payouts: "Payouts",
};

export const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  "New",
  "Onboarding",
  "In Production",
  "Partially Delivered",
  "On Hold",
];

export const NOTIFICATION_TYPES = [
  "New Client Onboarding",
  "Script Assigned",
  "Script Approved",
  "Script Revision",
  "Shoot Reminder",
  "Video Assigned to Editor",
  "Approaching Deadline",
  "Client Feedback Posted",
  "Final Video Approved",
  "Payment Recorded",
  "Overdue Invoice",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ASSET_KINDS = ["Brand Kit", "Logo", "Product", "Other"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];
