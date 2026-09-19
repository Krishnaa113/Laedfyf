import { connectDB } from "@/lib/db";
import { loadExecutiveAnalytics } from "@/lib/analytics/hub";
import {
  dayBounds,
  PENDING_SCRIPT_APPROVAL_STATUSES,
  PENDING_SCRIPT_STATUSES,
  startOfMonth,
  VIDEO_DELIVERED_STATUSES,
  VIDEO_PENDING_APPROVAL_STATUSES,
  VIDEO_REVISION_STATUSES,
} from "@/lib/dashboard/metrics";
import { SCRIPT_POPULATE, SHOOT_POPULATE, TASK_POPULATE, VIDEO_POPULATE } from "@/lib/populate";
import { canAccess, type AuthOk } from "@/lib/rbac";
import {
  serializeScript,
  serializeShoot,
  serializeTask,
  serializeTicket,
  serializeVideo,
  type SerializedScript,
  type SerializedShoot,
  type SerializedTask,
  type SerializedTicket,
  type SerializedVideo,
} from "@/lib/serialize";
import { ACTIVE_ORDER_STATUSES } from "@/lib/status";
import { Client } from "@/models/Client";
import { Employee } from "@/models/Employee";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { Script } from "@/models/Script";
import { Shoot } from "@/models/Shoot";
import { SupportTicket } from "@/models/SupportTicket";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Video } from "@/models/Video";

void User;

export type ProductionKpi = {
  employeeId: string;
  name: string;
  scriptsWritten: number;
  shootsCompleted: number;
  videosDelivered: number;
};

export type DashboardHub = {
  activeClients: number;
  newClientsOnboarded: number;
  activeOrders: number;
  pendingScripts: number;
  pendingScriptApprovals: number;
  pendingVideoApprovals: number;
  pendingApprovals: number;
  videosInProduction: number;
  videosPendingApproval: number;
  videosUnderRevision: number;
  videosDelivered: number;
  upcomingShoots: number;
  todayShoots: number;
  urgentTasks: number;
  overdueTasks: number;
  overduePayments: number;
  openTickets: number;
  revenue: number | null;
  expenses: number | null;
  netProfit: number | null;
  totalReceivables: number | null;
  upcomingShootList: SerializedShoot[];
  todayShootList: SerializedShoot[];
  urgentTaskList: SerializedTask[];
  overdueTaskList: SerializedTask[];
  pendingScriptApprovalList: SerializedScript[];
  pendingVideoApprovalList: SerializedVideo[];
  openTicketList: SerializedTicket[];
  production: ProductionKpi[];
};

function compact<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => Boolean(item));
}

export async function loadDashboardHub(auth: AuthOk): Promise<DashboardHub> {
  await connectDB();

  const related = auth.byClient();
  const clientScope =
    auth.session.user.role === "client"
      ? { _id: auth.session.user.clientId }
      : auth.session.user.role === "employee" && auth.session.user.allowedClientIds
        ? { _id: { $in: auth.session.user.allowedClientIds } }
        : {};
  const now = new Date();
  const monthStart = startOfMonth(now);
  const { start: todayStart, end: todayEnd } = dayBounds(now);
  const includeFinance = canAccess(auth.session.user, "analytics", "read");
  const openTaskFilter = {
    ...related,
    status: { $in: ["To Do", "In Progress"] as const },
  };

  const [
    activeClients,
    newClientsOnboarded,
    activeOrders,
    pendingScripts,
    pendingScriptApprovals,
    videosInProduction,
    videosPendingApproval,
    videosUnderRevision,
    videosDelivered,
    upcomingShoots,
    todayShoots,
    urgentTasks,
    overdueTasks,
    overduePayments,
    openTickets,
    upcomingShootDocs,
    todayShootDocs,
    urgentTaskDocs,
    overdueTaskDocs,
    pendingScriptDocs,
    pendingVideoDocs,
    openTicketDocs,
    scriptCounts,
    shootCounts,
    videoCounts,
    employees,
    finance,
  ] = await Promise.all([
    Client.countDocuments({ ...clientScope, status: "Active" }),
    Client.countDocuments({ ...clientScope, createdAt: { $gte: monthStart } }),
    Order.countDocuments({ ...related, status: { $in: ACTIVE_ORDER_STATUSES } }),
    Script.countDocuments({
      ...related,
      status: { $in: PENDING_SCRIPT_STATUSES },
    }),
    Script.countDocuments({
      ...related,
      status: { $in: PENDING_SCRIPT_APPROVAL_STATUSES },
    }),
    Video.countDocuments({ ...related, status: { $ne: "Delivered" } }),
    Video.countDocuments({
      ...related,
      status: { $in: VIDEO_PENDING_APPROVAL_STATUSES },
    }),
    Video.countDocuments({
      ...related,
      status: { $in: VIDEO_REVISION_STATUSES },
    }),
    Video.countDocuments({
      ...related,
      status: { $in: VIDEO_DELIVERED_STATUSES },
    }),
    Shoot.countDocuments({
      ...related,
      status: { $nin: ["Cancelled", "Completed"] },
      scheduledAt: { $gte: now },
    }),
    Shoot.countDocuments({
      ...related,
      status: { $nin: ["Cancelled"] },
      scheduledAt: { $gte: todayStart, $lte: todayEnd },
    }),
    Task.countDocuments({ ...openTaskFilter, priority: "Urgent" }),
    Task.countDocuments({
      ...openTaskFilter,
      deadline: { $ne: null, $lt: now },
    }),
    Payment.countDocuments({ ...related, status: "Overdue" }),
    SupportTicket.countDocuments({ ...related, status: { $ne: "Resolved" } }),
    Shoot.find({
      ...related,
      status: { $nin: ["Cancelled", "Completed"] },
      scheduledAt: { $gte: now },
    })
      .populate(SHOOT_POPULATE)
      .sort({ scheduledAt: 1 })
      .limit(6)
      .lean(),
    Shoot.find({
      ...related,
      status: { $nin: ["Cancelled"] },
      scheduledAt: { $gte: todayStart, $lte: todayEnd },
    })
      .populate(SHOOT_POPULATE)
      .sort({ scheduledAt: 1 })
      .limit(6)
      .lean(),
    Task.find({ ...openTaskFilter, priority: "Urgent" })
      .populate(TASK_POPULATE)
      .sort({ deadline: 1, createdAt: -1 })
      .limit(6)
      .lean(),
    Task.find({
      ...openTaskFilter,
      deadline: { $ne: null, $lt: now },
    })
      .populate(TASK_POPULATE)
      .sort({ deadline: 1 })
      .limit(6)
      .lean(),
    Script.find({
      ...related,
      status: { $in: PENDING_SCRIPT_APPROVAL_STATUSES },
    })
      .populate(SCRIPT_POPULATE)
      .sort({ deadline: 1, createdAt: -1 })
      .limit(6)
      .lean(),
    Video.find({
      ...related,
      status: { $in: VIDEO_PENDING_APPROVAL_STATUSES },
    })
      .populate(VIDEO_POPULATE)
      .sort({ deadline: 1, createdAt: -1 })
      .limit(6)
      .lean(),
    SupportTicket.find({ ...related, status: { $ne: "Resolved" } })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    Script.aggregate<{ _id: unknown; count: number }>([
      { $match: { ...related, writerId: { $ne: null } } },
      { $group: { _id: "$writerId", count: { $sum: 1 } } },
    ]),
    Shoot.aggregate<{ _id: unknown; count: number }>([
      { $match: { ...related, status: "Completed", shootManagerId: { $ne: null } } },
      { $group: { _id: "$shootManagerId", count: { $sum: 1 } } },
    ]),
    Video.aggregate<{ _id: unknown; count: number }>([
      { $match: { ...related, status: "Delivered", editorId: { $ne: null } } },
      { $group: { _id: "$editorId", count: { $sum: 1 } } },
    ]),
    Employee.find({ isActive: true })
      .populate({ path: "userId", select: "name email employeeSubRole" })
      .lean(),
    includeFinance ? loadExecutiveAnalytics() : Promise.resolve(null),
  ]);

  const scriptsByEmployee = new Map(scriptCounts.map((row) => [String(row._id), row.count]));
  const shootsByEmployee = new Map(shootCounts.map((row) => [String(row._id), row.count]));
  const videosByEmployee = new Map(videoCounts.map((row) => [String(row._id), row.count]));

  const production = employees
    .map((employee) => {
      const id = String(employee._id);
      const user =
        employee.userId && typeof employee.userId === "object" && "name" in employee.userId
          ? (employee.userId as { name?: string })
          : null;
      return {
        employeeId: id,
        name: user?.name || String(employee.jobTitle || "Employee"),
        scriptsWritten: scriptsByEmployee.get(id) ?? 0,
        shootsCompleted: shootsByEmployee.get(id) ?? 0,
        videosDelivered: videosByEmployee.get(id) ?? 0,
      };
    })
    .filter(
      (row) =>
        row.scriptsWritten + row.shootsCompleted + row.videosDelivered > 0 ||
        auth.session.user.role === "owner" ||
        auth.session.user.role === "admin",
    )
    .sort(
      (a, b) =>
        b.videosDelivered + b.shootsCompleted + b.scriptsWritten -
        (a.videosDelivered + a.shootsCompleted + a.scriptsWritten),
    );

  return {
    activeClients,
    newClientsOnboarded,
    activeOrders,
    pendingScripts,
    pendingScriptApprovals,
    pendingVideoApprovals: videosPendingApproval,
    pendingApprovals: pendingScriptApprovals + videosPendingApproval,
    videosInProduction,
    videosPendingApproval,
    videosUnderRevision,
    videosDelivered,
    upcomingShoots,
    todayShoots,
    urgentTasks,
    overdueTasks,
    overduePayments,
    openTickets,
    revenue: finance?.revenue ?? null,
    expenses: finance?.expenses ?? null,
    netProfit: finance?.netProfit ?? null,
    totalReceivables: finance?.totalReceivables ?? null,
    upcomingShootList: compact(upcomingShootDocs.map((doc) => serializeShoot(doc))),
    todayShootList: compact(todayShootDocs.map((doc) => serializeShoot(doc))),
    urgentTaskList: compact(
      urgentTaskDocs.map((doc) => serializeTask(doc as Record<string, unknown>)),
    ),
    overdueTaskList: compact(
      overdueTaskDocs.map((doc) => serializeTask(doc as Record<string, unknown>)),
    ),
    pendingScriptApprovalList: compact(
      pendingScriptDocs.map((doc) => serializeScript(doc)),
    ),
    pendingVideoApprovalList: compact(
      pendingVideoDocs.map((doc) => serializeVideo(doc)),
    ),
    openTicketList: compact(openTicketDocs.map((doc) => serializeTicket(doc))),
    production,
  };
}
