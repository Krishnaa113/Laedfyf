export type { NotificationChannel, NotificationPayload } from "./types";
export {
  emailChannel,
  getNotificationChannels,
  inAppChannel,
  registerNotificationChannel,
  resetNotificationChannels,
  whatsappChannel,
} from "./channels";
export { emitNotification } from "./emit";
export {
  notifyApproachingDeadline,
  notifyClientFeedbackPosted,
  notifyClientOnboarded,
  notifyFinalVideoApproved,
  notifyOverdueInvoice,
  notifyPaymentRecorded,
  notifyScriptApproved,
  notifyScriptAssigned,
  notifyScriptRevision,
  notifyShootReminder,
  notifyVideoAssignedToEditor,
} from "./triggers";
export { dispatchDueNotifications } from "./scheduler";

export function queueNotification(task: Promise<unknown>) {
  return task.catch(() => undefined);
}
