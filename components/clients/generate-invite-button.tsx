"use client";

import { useState } from "react";
import { CopyInviteField } from "@/components/clients/copy-invite-field";

type Invite = { inviteLink: string; expiresAt: string };

export function GenerateInviteButton({
  clientId,
  passwordSet,
}: {
  clientId: string;
  passwordSet: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);

  async function generate(kind: "invite" | "reset") {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/clients/${clientId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = (await response.json()) as {
      error?: string;
      invite?: Invite;
    };
    setPending(false);
    if (!response.ok || !data.invite) {
      setError(data.error || "Could not generate link.");
      return;
    }
    setInvite(data.invite);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {passwordSet ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void generate("reset")}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate reset link"}
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void generate("invite")}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {pending ? "Generating…" : "Generate invite link"}
          </button>
        )}
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {invite ? (
        <CopyInviteField url={invite.inviteLink} expiresAt={invite.expiresAt} />
      ) : null}
    </div>
  );
}
