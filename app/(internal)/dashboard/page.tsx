import Link from "next/link";
import { loadDashboardHub } from "@/lib/dashboard/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { canAccess } from "@/lib/rbac";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DashboardPage() {
  const auth = await requirePageAccess("notifications", "read");
  const hub = await loadDashboardHub(auth);
  const showFinance = canAccess(auth.session.user, "analytics", "read");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Internal dashboard</h1>
        <p className="mt-1 text-sm text-white/60">
          Live production, finance, and ticket snapshot for your current access.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/clients?status=Active" label="Active clients" value={String(hub.activeClients)} />
        <Stat href="/clients" label="New clients this month" value={String(hub.newClientsOnboarded)} />
        <Stat href="/orders" label="Active orders" value={String(hub.activeOrders)} />
        <Stat href="/scripts" label="Pending scripts" value={String(hub.pendingScripts)} />
        <Stat href="/scripts?status=Sent%20to%20Client" label="Pending approvals" value={String(hub.pendingApprovals)} />
        <Stat href="/tasks?priority=Urgent" label="Urgent tasks" value={String(hub.urgentTasks)} />
        <Stat href="/tasks" label="Overdue tasks" value={String(hub.overdueTasks)} />
        <Stat href="/shoots" label="Today's shoots" value={String(hub.todayShoots)} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/videos" label="In production" value={String(hub.videosInProduction)} />
        <Stat href="/videos?status=Client%20Review" label="Pending video approval" value={String(hub.videosPendingApproval)} />
        <Stat href="/videos?status=Revision" label="Under revision" value={String(hub.videosUnderRevision)} />
        <Stat href="/videos?status=Delivered" label="Delivered" value={String(hub.videosDelivered)} />
        <Stat href="/shoots" label="Upcoming shoots" value={String(hub.upcomingShoots)} />
        <Stat href="/payments?status=Overdue" label="Overdue invoices" value={String(hub.overduePayments)} />
        <Stat href="/tickets" label="Open tickets" value={String(hub.openTickets)} />
      </section>

      {showFinance ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat href="/analytics" label="Revenue" value={formatMoney(hub.revenue ?? 0)} />
          <Stat href="/analytics" label="Expenses" value={formatMoney(hub.expenses ?? 0)} />
          <Stat href="/analytics" label="Net profit" value={formatMoney(hub.netProfit ?? 0)} />
          <Stat href="/payments" label="Receivables" value={formatMoney(hub.totalReceivables ?? 0)} />
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <Widget title="Today's shoots" href="/shoots" linkLabel="Calendar">
          {hub.todayShootList.length === 0 ? (
            <Empty>No shoots today.</Empty>
          ) : (
            <ul className="divide-y divide-white/10">
              {hub.todayShootList.map((shoot) => (
                <li key={shoot.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/shoots/${shoot.id}`} className="text-sm hover:text-brand">
                      {shoot.location || "Shoot"}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">
                      {shoot.companyName || "—"} · {formatDate(shoot.scheduledAt)}
                    </p>
                  </div>
                  <span className="text-xs text-white/50">{shoot.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Task urgency" href="/tasks" linkLabel="Tasks">
          {hub.urgentTaskList.length === 0 && hub.overdueTaskList.length === 0 ? (
            <Empty>No urgent or overdue tasks.</Empty>
          ) : (
            <ul className="divide-y divide-white/10">
              {hub.overdueTaskList.map((task) => (
                <TaskRow key={`overdue-${task.id}`} task={task} badge="Overdue" />
              ))}
              {hub.urgentTaskList
                .filter((task) => !hub.overdueTaskList.some((item) => item.id === task.id))
                .map((task) => (
                  <TaskRow key={`urgent-${task.id}`} task={task} badge={task.priority} />
                ))}
            </ul>
          )}
        </Widget>

        <Widget title="Pending approvals" href="/scripts?status=Sent%20to%20Client" linkLabel="Scripts">
          {hub.pendingScriptApprovalList.length === 0 &&
          hub.pendingVideoApprovalList.length === 0 ? (
            <Empty>Nothing waiting on approval.</Empty>
          ) : (
            <ul className="divide-y divide-white/10">
              {hub.pendingScriptApprovalList.map((script) => (
                <li key={`script-${script.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/scripts/${script.id}`} className="text-sm hover:text-brand">
                      Script #{script.videoNumber || "—"}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">
                      {script.companyName || "Client"} · waiting on client
                    </p>
                  </div>
                  <span className="text-xs text-white/50">{script.status}</span>
                </li>
              ))}
              {hub.pendingVideoApprovalList.map((video) => (
                <li key={`video-${video.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/videos/${video.id}`} className="text-sm hover:text-brand">
                      Video #{video.videoNumber || "—"}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">
                      {video.companyName || "Client"} · {video.status}
                    </p>
                  </div>
                  <span className="text-xs text-white/50">{video.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Upcoming shoots" href="/shoots" linkLabel="View all">
          {hub.upcomingShootList.length === 0 ? (
            <Empty>No upcoming shoots.</Empty>
          ) : (
            <ul className="divide-y divide-white/10">
              {hub.upcomingShootList.map((shoot) => (
                <li key={shoot.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/shoots/${shoot.id}`} className="text-sm hover:text-brand">
                      {shoot.location || "Shoot"}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">
                      {shoot.companyName || "—"} · {formatDate(shoot.scheduledAt)}
                    </p>
                  </div>
                  <span className="text-xs text-white/50">{shoot.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Widget>

        <Widget title="Open tickets" href="/tickets" linkLabel="Inbox">
          {hub.openTicketList.length === 0 ? (
            <Empty>No open tickets.</Empty>
          ) : (
            <ul className="divide-y divide-white/10">
              {hub.openTicketList.map((ticket) => (
                <li key={ticket.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <Link href={`/tickets/${ticket.id}`} className="text-sm hover:text-brand">
                      {ticket.subject}
                    </Link>
                    <p className="mt-1 text-xs text-white/50">
                      {ticket.companyName || "Client"} · {ticket.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10">
        <div className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-medium">Employee production</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Scripts</th>
              <th className="px-4 py-3 font-medium">Shoots done</th>
              <th className="px-4 py-3 font-medium">Videos delivered</th>
            </tr>
          </thead>
          <tbody>
            {hub.production.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-white/50">
                  No production activity yet.
                </td>
              </tr>
            ) : (
              hub.production.map((row) => (
                <tr key={row.employeeId} className="border-t border-white/10">
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 text-white/70">{row.scriptsWritten}</td>
                  <td className="px-4 py-3 text-white/70">{row.shootsCompleted}</td>
                  <td className="px-4 py-3 text-white/70">{row.videosDelivered}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function Stat({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-white/10 p-4 hover:border-brand/40">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Link>
  );
}

function Widget({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <Link href={href} className="text-xs text-brand hover:underline">
          {linkLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-6 text-sm text-white/50">{children}</p>;
}

function TaskRow({
  task,
  badge,
}: {
  task: { id: string; title: string; deadline: string | null };
  badge: string;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <Link href={`/tasks/${task.id}`} className="text-sm hover:text-brand">
          {task.title}
        </Link>
        <p className="mt-1 text-xs text-white/50">{formatDate(task.deadline)}</p>
      </div>
      <span className="text-xs text-brand">{badge}</span>
    </li>
  );
}
