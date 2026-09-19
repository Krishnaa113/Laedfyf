"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({
  callbackUrl = "/login",
}: {
  callbackUrl?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:border-brand hover:text-brand"
    >
      Sign out
    </button>
  );
}
