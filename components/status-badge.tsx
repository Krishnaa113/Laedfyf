import {
  CLIENT_STATUS_LABELS,
  CREATOR_AVAILABILITY_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  SCRIPT_STATUS_LABELS,
  SHOOT_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TICKET_STATUS_LABELS,
  VIDEO_STATUS_LABELS,
  normalizeClientStatus,
  normalizeCreatorAvailability,
  normalizeOrderStatus,
  normalizePaymentStatus,
  normalizePayoutStatus,
  normalizeScriptStatus,
  normalizeShootStatus,
  normalizeTaskPriority,
  normalizeTaskStatus,
  normalizeTicketStatus,
  normalizeVideoStatus,
  type ClientStatus,
  type CreatorAvailabilityStatus,
  type OrderStatus,
  type PaymentStatus,
  type PayoutStatus,
  type ScriptStatus,
  type ShootStatus,
  type TaskPriority,
  type TaskStatus,
  type TicketStatus,
  type VideoStatus,
} from "@/lib/status";

const CLIENT_TONES: Record<ClientStatus, string> = {
  Lead: "bg-white/10 text-white",
  New: "bg-sky-500/15 text-sky-300",
  Onboarding: "bg-brand/15 text-brand",
  Active: "bg-emerald-500/15 text-emerald-300",
  "On Hold": "bg-yellow-500/15 text-yellow-300",
  Completed: "bg-blue-500/15 text-blue-300",
  Inactive: "bg-white/10 text-white/60",
};

const ORDER_TONES: Record<OrderStatus, string> = {
  New: "bg-white/10 text-white",
  Onboarding: "bg-brand/15 text-brand",
  "In Production": "bg-sky-500/15 text-sky-300",
  "Partially Delivered": "bg-yellow-500/15 text-yellow-300",
  Completed: "bg-emerald-500/15 text-emerald-300",
  "On Hold": "bg-white/10 text-white/60",
  Cancelled: "bg-red-500/15 text-red-300",
};

const SCRIPT_TONES: Record<ScriptStatus, string> = {
  Draft: "bg-white/10 text-white",
  Assigned: "bg-sky-500/15 text-sky-300",
  "In Review": "bg-brand/15 text-brand",
  "Sent to Client": "bg-yellow-500/15 text-yellow-300",
  "Revision Required": "bg-red-500/15 text-red-300",
  Approved: "bg-emerald-500/15 text-emerald-300",
  "Ready for Shoot": "bg-blue-500/15 text-blue-300",
};

const CREATOR_TONES: Record<CreatorAvailabilityStatus, string> = {
  Available: "bg-emerald-500/15 text-emerald-300",
  Booked: "bg-brand/15 text-brand",
  Unavailable: "bg-white/10 text-white/60",
  "On Hold": "bg-yellow-500/15 text-yellow-300",
};

const SHOOT_TONES: Record<ShootStatus, string> = {
  Scheduled: "bg-white/10 text-white",
  Confirmed: "bg-sky-500/15 text-sky-300",
  "In Progress": "bg-brand/15 text-brand",
  Completed: "bg-emerald-500/15 text-emerald-300",
  Cancelled: "bg-white/10 text-white/60",
  "Reshoot Required": "bg-red-500/15 text-red-300",
};

const VIDEO_TONES: Record<VideoStatus, string> = {
  "Script Approved": "bg-white/10 text-white",
  "Shoot Pending": "bg-sky-500/15 text-sky-300",
  "Raw Footage Received": "bg-brand/15 text-brand",
  "Video Editing": "bg-yellow-500/15 text-yellow-300",
  "Internal QA": "bg-blue-500/15 text-blue-300",
  "Client Review": "bg-yellow-500/15 text-yellow-300",
  Revision: "bg-red-500/15 text-red-300",
  "Final Approved": "bg-emerald-500/15 text-emerald-300",
  Delivered: "bg-emerald-500/20 text-emerald-200",
};

const PAYMENT_TONES: Record<PaymentStatus, string> = {
  Unpaid: "bg-white/10 text-white/70",
  "Partially Paid": "bg-yellow-500/15 text-yellow-300",
  Paid: "bg-emerald-500/15 text-emerald-300",
  Overdue: "bg-red-500/15 text-red-300",
};

const PAYOUT_TONES: Record<PayoutStatus, string> = {
  Pending: "bg-white/10 text-white/70",
  Approved: "bg-sky-500/15 text-sky-300",
  Paid: "bg-emerald-500/15 text-emerald-300",
};

const TICKET_TONES: Record<TicketStatus, string> = {
  Open: "bg-brand/15 text-brand",
  "In Progress": "bg-sky-500/15 text-sky-300",
  Resolved: "bg-emerald-500/15 text-emerald-300",
};

const TASK_TONES: Record<TaskStatus, string> = {
  "To Do": "bg-white/10 text-white",
  "In Progress": "bg-sky-500/15 text-sky-300",
  Done: "bg-emerald-500/15 text-emerald-300",
};

const TASK_PRIORITY_TONES: Record<TaskPriority, string> = {
  Urgent: "bg-red-500/15 text-red-300",
  High: "bg-orange-500/15 text-orange-300",
  Medium: "bg-yellow-500/15 text-yellow-300",
  Low: "bg-white/10 text-white/70",
};

export function ClientStatusBadge({ status }: { status: string }) {
  const key = normalizeClientStatus(status);
  const label = CLIENT_STATUS_LABELS[key];
  const tone = CLIENT_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  const key = normalizeOrderStatus(status);
  const label = ORDER_STATUS_LABELS[key];
  const tone = ORDER_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function ScriptStatusBadge({ status }: { status: string }) {
  const key = normalizeScriptStatus(status);
  const label = SCRIPT_STATUS_LABELS[key];
  const tone = SCRIPT_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function CreatorAvailabilityBadge({ status }: { status: string }) {
  const key = normalizeCreatorAvailability(status);
  const label = CREATOR_AVAILABILITY_LABELS[key];
  const tone = CREATOR_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function ShootStatusBadge({ status }: { status: string }) {
  const key = normalizeShootStatus(status);
  const label = SHOOT_STATUS_LABELS[key];
  const tone = SHOOT_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function VideoStatusBadge({ status }: { status: string }) {
  const key = normalizeVideoStatus(status);
  const label = VIDEO_STATUS_LABELS[key];
  const tone = VIDEO_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const key = normalizePaymentStatus(status);
  const label = PAYMENT_STATUS_LABELS[key];
  const tone = PAYMENT_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function PayoutStatusBadge({ status }: { status: string }) {
  const key = normalizePayoutStatus(status);
  const label = PAYOUT_STATUS_LABELS[key];
  const tone = PAYOUT_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function TicketStatusBadge({ status }: { status: string }) {
  const key = normalizeTicketStatus(status);
  const label = TICKET_STATUS_LABELS[key];
  const tone = TICKET_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const key = normalizeTaskStatus(status);
  const label = TASK_STATUS_LABELS[key];
  const tone = TASK_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const key = normalizeTaskPriority(priority);
  const label = TASK_PRIORITY_LABELS[key];
  const tone = TASK_PRIORITY_TONES[key];

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
      {label}
    </span>
  );
}
