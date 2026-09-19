"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/clients/reveal-password";

export function SetPasswordForm({
  endpoint,
  label = "New password",
  hint = "No OTP or current password required. The next sign-in uses this password.",
}: {
  endpoint: string;
  label?: string;
  hint?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setSuccess(null);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setSuccess(null);
      return;
    }

    setPending(true);
    setError(null);
    setSuccess(null);

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    let payload: { error?: string } = {};
    try {
      payload = (await response.json()) as { error?: string };
    } catch {
      payload = {};
    }

    if (!response.ok) {
      setError(payload.error || "Could not update password.");
      setPending(false);
      return;
    }

    form.reset();
    setSuccess("Password updated. They can sign in with it immediately.");
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
      <PasswordInput name="password" label={label} required />
      <PasswordInput name="confirmPassword" label="Confirm password" required />
      <p className="text-xs text-white/45 md:col-span-2">{hint}</p>
      {error ? <p className="text-sm text-red-400 md:col-span-2">{error}</p> : null}
      {success ? <p className="text-sm text-brand md:col-span-2">{success}</p> : null}
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
        >
          {pending ? "Saving…" : "Set password"}
        </button>
      </div>
    </form>
  );
}
