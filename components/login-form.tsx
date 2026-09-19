"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  USE_PORTAL_LOGIN_ERROR,
  USE_PORTAL_LOGIN_MESSAGE,
} from "@/lib/clients/invite-messages";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      if (result.error === USE_PORTAL_LOGIN_ERROR) {
        setError(USE_PORTAL_LOGIN_MESSAGE);
        return;
      }
      if (result.error !== "CredentialsSignin") {
        setError(result.error);
        return;
      }
      setError("Invalid email or password.");
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl") ?? "/";
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-white/70">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
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
