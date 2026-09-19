import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadClientHub } from "@/lib/clients/hub";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { ClientStatusBadge, OrderStatusBadge, ScriptStatusBadge } from "@/components/status-badge";
import { AddOrderForm } from "@/components/clients/add-order-form";
import { AddAssetForm } from "@/components/clients/add-asset-form";
import { ClientStatusPipeline } from "@/components/clients/status-pipeline";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { GenerateInviteButton } from "@/components/clients/generate-invite-button";
import { RevealPassword } from "@/components/clients/reveal-password";
import { SetPasswordForm } from "@/components/account/set-password-form";
import { canManageClientInvites } from "@/lib/roles";

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("clients", "read");
  const canWrite = pageCanWrite(auth, "clients");
  const canWriteOrders = pageCanWrite(auth, "orders");
  const canWriteAssets = pageCanWrite(auth, "assets");
  const canManageInvites = canManageClientInvites(auth.session.user.role);
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id) || !auth.canAccessClient(id)) {
    notFound();
  }

  const hub = await loadClientHub(auth, id);
  if (!hub) {
    notFound();
  }

  const {
    client,
    activeOrders,
    orders,
    scripts,
    shoots,
    creatorHistory,
    videos,
    invoices,
    tickets,
    assets,
    activityLog,
  } = hub;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/clients" className="text-sm text-white/50 hover:text-brand">
            Back to clients
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{client.name}</h1>
          <p className="mt-1 text-white/70">{client.companyName}</p>
        </div>
        <div className="flex items-center gap-3">
          <ClientStatusBadge status={client.status} />
          {canWrite ? (
            <>
              <Link
                href={`/clients/${client.id}/edit`}
                className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand"
              >
                Edit client
              </Link>
              <DeleteClientButton
                clientId={client.id}
                companyName={client.companyName}
              />
            </>
          ) : null}
        </div>
      </div>

      <ClientStatusPipeline
        clientId={client.id}
        status={client.status}
        canWrite={canWrite}
      />

      <section className="grid gap-4 rounded-lg border border-white/10 p-6 md:grid-cols-3">
        <Info label="Email" value={client.email} />
        <Info label="Phone" value={client.phone} />
        <Info label="WhatsApp" value={client.whatsapp} />
        <Info label="Business / brand name" value={client.brandName} />
        <Info label="Industry" value={client.industry} />
        <Info label="GST / Tax ID" value={client.gstTaxId} />
        <Info label="Assigned employee" value={client.assignedEmployeeName} />
        <Info label="Source" value={client.source} />
        <Info label="Company" value={client.companyName} />
        <div>
          <p className="text-xs uppercase tracking-wide text-white/40">
            Portal password
          </p>
          <div className="mt-1 text-sm">
            {canManageInvites ? (
              <RevealPassword
                value={"portalPassword" in client ? client.portalPassword : null}
              />
            ) : (
              <p>{client.passwordSet ? "Password set" : "Not set"}</p>
            )}
          </div>
        </div>
      </section>
      {canManageInvites ? (
        <section className="rounded-lg border border-white/10 p-6">
          <h2 className="text-lg font-medium">Portal password</h2>
          <p className="mt-1 text-sm text-white/60">
            Owner or admin can set or replace this password immediately. No OTP,
            email, or current password is required.
          </p>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-white/40">
              Current password
            </p>
            <div className="mt-2">
              <RevealPassword
                value={"portalPassword" in client ? client.portalPassword : null}
              />
            </div>
          </div>
          <div className="mt-6">
            <SetPasswordForm
              endpoint={`/api/clients/${client.id}`}
              label="New portal password"
              hint="The client signs in on /portal/login with their client name and this password."
            />
          </div>
          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="text-sm font-medium">Invite link</h3>
            <p className="mt-1 text-sm text-white/60">
              Optional 7-day link if you still want them to set it themselves.
            </p>
            <div className="mt-4">
              <GenerateInviteButton
                clientId={client.id}
                passwordSet={client.passwordSet}
              />
            </div>
          </div>
        </section>
      ) : null}

      <HubSection
        title="Active orders"
        count={activeOrders.length}
        empty="No active orders."
      >
        {canWriteOrders ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <AddOrderForm clientId={client.id} />
            <Link
              href={`/orders/new?clientId=${client.id}`}
              className="shrink-0 text-sm text-brand hover:underline"
            >
              Full package form
            </Link>
          </div>
        ) : null}
        <DataTable
          columns={["Package", "Videos", "Remaining", "Outstanding", "Status"]}
          rows={activeOrders.map((order) => [
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="hover:text-brand"
            >
              {order.packageName}
            </Link>,
            `${order.production.ordered}/${order.contractedVideoCount}`,
            String(order.production.remaining),
            formatMoney(order.outstandingBalance ?? 0),
            <OrderStatusBadge key={`${order.id}-status`} status={order.status} />,
          ])}
        />
      </HubSection>

      <HubSection
        title="All packages"
        count={orders.length}
        empty="No packages recorded."
      >
        <DataTable
          columns={["Package", "Videos", "Remaining", "Outstanding", "Status"]}
          rows={orders.map((order) => [
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="hover:text-brand"
            >
              {order.packageName}
            </Link>,
            `${order.production.ordered}/${order.contractedVideoCount}`,
            String(order.production.remaining),
            formatMoney(order.outstandingBalance ?? 0),
            <OrderStatusBadge key={`${order.id}-all-status`} status={order.status} />,
          ])}
        />
      </HubSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <HubSection title="Scripts" count={scripts.length} empty="No scripts yet.">
          {pageCanWrite(auth, "scripts") ? (
            <Link
              href={`/scripts/new?clientId=${client.id}`}
              className="mt-2 inline-flex text-sm text-brand hover:underline"
            >
              Add script
            </Link>
          ) : null}
          <DataTable
            columns={["Video", "Language", "Creator", "Status"]}
            rows={scripts.map((script) => [
              <Link
                key={script.id}
                href={`/scripts/${script.id}`}
                className="hover:text-brand"
              >
                #{script.videoNumber}
              </Link>,
              script.language || "—",
              script.creatorName || "—",
              <ScriptStatusBadge key={`${script.id}-status`} status={script.status} />,
            ])}
          />
        </HubSection>
        <HubSection
          title="Shoot history"
          count={shoots.length}
          empty="No shoots recorded."
        >
          <DataTable
            columns={["When", "Location", "Creator", "Status"]}
            rows={shoots.map((shoot) => [
              formatDate(shoot.scheduledAt),
              shoot.location || "—",
              shoot.creatorName || "—",
              shoot.status,
            ])}
          />
        </HubSection>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <HubSection
          title="Creator history"
          count={creatorHistory.length}
          empty="No creators linked through shoots or videos."
        >
          <DataTable
            columns={["Creator", "Shoots", "Videos"]}
            rows={creatorHistory.map((creator) => [
              creator.name,
              String(creator.shootCount),
              String(creator.videoCount),
            ])}
          />
        </HubSection>
        <HubSection
          title="Video assets"
          count={videos.length}
          empty="No video assets yet."
        >
          <DataTable
            columns={["Status", "Creator", "File", "Delivery"]}
            rows={videos.map((video) => [
              video.status,
              video.creatorName || "—",
              video.fileLink ? (
                <a
                  key={`${video.id}-file`}
                  href={video.fileLink}
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              ) : (
                "—"
              ),
              video.finalDeliveryLink ? (
                <a
                  key={`${video.id}-delivery`}
                  href={video.finalDeliveryLink}
                  className="text-brand hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  Delivered
                </a>
              ) : (
                "—"
              ),
            ])}
          />
        </HubSection>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <HubSection title="Invoices" count={invoices.length} empty="No invoices yet.">
          <DataTable
            columns={["Amount", "Received", "Pending", "Status"]}
            rows={invoices.map((invoice) => [
              formatMoney(invoice.invoiceAmount),
              formatMoney(invoice.amountReceived),
              formatMoney(invoice.pendingBalance),
              invoice.status,
            ])}
          />
        </HubSection>
        <HubSection
          title="Support tickets"
          count={tickets.length}
          empty="No support tickets."
        >
          <DataTable
            columns={["Subject", "Status", "Opened"]}
            rows={tickets.map((ticket) => [
              ticket.subject,
              ticket.status,
              formatDate(ticket.createdAt),
            ])}
          />
        </HubSection>
      </section>

      <HubSection title="Assets" count={assets.length} empty="No brand assets yet.">
        {canWriteAssets ? <AddAssetForm clientId={client.id} /> : null}
        <DataTable
          columns={["Name", "Kind", "Link"]}
          rows={assets.map((asset) => [
            asset.name,
            asset.kind,
            asset.url ? (
              <a
                key={asset.id}
                href={asset.url}
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            ) : (
              "—"
            ),
          ])}
        />
      </HubSection>

      <HubSection
        title="Activity log"
        count={activityLog.length}
        empty="No activity recorded for this client."
      >
        <DataTable
          columns={["When", "Actor", "Action"]}
          rows={activityLog.map((entry) => [
            formatDate(entry.createdAt),
            entry.actorName,
            entry.action,
          ])}
        />
      </HubSection>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-sm">{value || "—"}</p>
    </div>
  );
}

function HubSection({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-white/10 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-white/50">{count}</p>
      </div>
      {count === 0 ? <p className="mt-3 text-sm text-white/50">{empty}</p> : null}
      {children}
    </section>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: ReactNode[][];
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-white/60">
          <tr>
            {columns.map((column) => (
              <th key={column} className="px-4 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-white/10">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-white/80">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
