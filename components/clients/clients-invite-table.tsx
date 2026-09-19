"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClientStatusBadge } from "@/components/status-badge";
import { GenerateInviteButton } from "@/components/clients/generate-invite-button";
import { CopyInviteField } from "@/components/clients/copy-invite-field";
import { RevealPassword } from "@/components/clients/reveal-password";

export type ClientListRow = {
  id: string;
  name: string;
  companyName: string;
  brandName: string;
  email: string;
  phone: string;
  whatsapp: string;
  assignedEmployeeName: string;
  source: string;
  status: string;
  passwordSet: boolean;
  portalPassword?: string | null;
};

function toCsv(rows: Array<{ clientName: string; phone: string; whatsapp: string; inviteLink: string }>) {
  const header = ["clientName", "phone", "whatsapp", "inviteLink"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) => {
          const value = String(row[key as keyof typeof row] ?? "");
          return `"${value.replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ];
  return lines.join("\n");
}

export function ClientsInviteTable({
  clients,
  canManageInvites,
}: {
  clients: ClientListRow[];
  canManageInvites: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<
    Array<{ clientName: string; phone: string; whatsapp: string; inviteLink: string }>
  >([]);

  const inviteable = useMemo(
    () => clients.filter((client) => !client.passwordSet),
    [clients],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAll() {
    const ids = inviteable.map((client) => client.id);
    setSelected((current) => (current.length === ids.length ? [] : ids));
  }

  async function generateBulk() {
    const ids = selected.filter((id) =>
      inviteable.some((client) => client.id === id),
    );
    if (ids.length === 0) {
      setError("Select clients that have not set a password yet.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch("/api/clients/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    const data = (await response.json()) as {
      error?: string;
      invites?: Array<{
        clientName: string;
        phone: string;
        whatsapp: string;
        inviteLink: string;
      }>;
    };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not generate invite links.");
      return;
    }
    setIssued(data.invites ?? []);
  }

  function downloadCsv() {
    const blob = new Blob([toCsv(issued)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "client-invite-links.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {canManageInvites ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void generateBulk()}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate invite links"}
          </button>
          <p className="text-sm text-white/50">
            {selected.length} selected · only clients without a portal password
          </p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {issued.length > 0 ? (
        <section className="rounded-lg border border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Invite batch ({issued.length})</h2>
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand"
            >
              Download CSV
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="py-2 pr-3 font-medium">Client</th>
                  <th className="py-2 pr-3 font-medium">Phone / WhatsApp</th>
                  <th className="py-2 font-medium">Invite link</th>
                </tr>
              </thead>
              <tbody>
                {issued.map((row) => (
                  <tr key={row.inviteLink} className="border-t border-white/10">
                    <td className="py-2 pr-3">{row.clientName}</td>
                    <td className="py-2 pr-3 text-white/70">
                      {row.whatsapp || row.phone || "—"}
                    </td>
                    <td className="py-2">
                      <CopyInviteField url={row.inviteLink} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              {canManageInvites ? (
                <th className="px-4 py-3 font-medium">
                  <input
                    type="checkbox"
                    checked={
                      inviteable.length > 0 && selected.length === inviteable.length
                    }
                    onChange={toggleAll}
                    aria-label="Select all clients without a password"
                  />
                </th>
              ) : null}
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Brand</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Assigned</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManageInvites ? (
                <th className="px-4 py-3 font-medium">Password</th>
              ) : null}
              <th className="px-4 py-3 font-medium">Portal</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 ? (
              <tr>
                <td
                  colSpan={canManageInvites ? 11 : 9}
                  className="px-4 py-8 text-center text-white/50"
                >
                  No clients match this filter.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="border-t border-white/10 align-top">
                  {canManageInvites ? (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        disabled={client.passwordSet}
                        checked={selected.includes(client.id)}
                        onChange={() => toggle(client.id)}
                        aria-label={`Select ${client.companyName || client.name}`}
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <Link href={`/clients/${client.id}`} className="hover:text-brand">
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-white/80">{client.companyName}</td>
                  <td className="px-4 py-3 text-white/70">{client.brandName || "—"}</td>
                  <td className="px-4 py-3 text-white/70">{client.email}</td>
                  <td className="px-4 py-3 text-white/70">{client.phone || "—"}</td>
                  <td className="px-4 py-3 text-white/70">
                    {client.assignedEmployeeName || "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70">{client.source || "—"}</td>
                  <td className="px-4 py-3">
                    <ClientStatusBadge status={client.status} />
                  </td>
                  {canManageInvites ? (
                    <td className="px-4 py-3">
                      <RevealPassword value={client.portalPassword} />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    {canManageInvites ? (
                      <GenerateInviteButton
                        clientId={client.id}
                        passwordSet={client.passwordSet}
                      />
                    ) : (
                      <span className="text-white/60">
                        {client.passwordSet ? "Password set" : "Invite pending"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
