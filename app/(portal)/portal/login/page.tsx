import { Suspense } from "react";
import Link from "next/link";
import { PortalLoginForm } from "@/components/portal/portal-login-form";

export default function PortalLoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium tracking-wide text-brand">LEADYFY OS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Client portal</h1>
        <p className="mt-2 text-sm text-white/60">
          Sign in with the client name and password the agency created for you.
        </p>
        <Suspense>
          <PortalLoginForm />
        </Suspense>
        <p className="mt-6 text-sm text-white/50">
          Agency staff?{" "}
          <Link href="/login" className="text-brand hover:underline">
            Staff sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
