"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { INVITE_REQUIRED_ERROR, INVITE_REQUIRED_MESSAGE } from "@/lib/clients/invite-messages";

export function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const clientName = String(formData.get("clientName") ?? "");
    const password = String(formData.get("password") ?? "");

    const check = await fetch("/api/portal/login-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName, password }),
    });
    const raw = await check.text();
    let checkData: { error?: string } = {};
    if (raw) {
      try {
        checkData = JSON.parse(raw) as { error?: string };
      } catch {
        checkData = {};
      }
    }
    if (check.status === 403) {
      setPending(false);
      setError(checkData.error || INVITE_REQUIRED_MESSAGE);
      return;
    }
    if (!check.ok) {
      setPending(false);
      setError(checkData.error || "Invalid client name or password.");
      return;
    }

    const result = await signIn("credentials", {
      clientName,
      email: clientName,
      password,
      intent: "portal",
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      if (result.error === INVITE_REQUIRED_ERROR) {
        setError(INVITE_REQUIRED_MESSAGE);
        return;
      }
      setError("Invalid client name or password.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/portal";
    router.push(callbackUrl.startsWith("/portal") ? callbackUrl : "/portal");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Client name</span>
        <input
          name="clientName"
          type="text"
          required
          autoComplete="username"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-white outline-none focus:border-brand"
        />
      </label>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-charcoal disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
