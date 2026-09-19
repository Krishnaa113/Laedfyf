import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium tracking-wide text-brand">LEADYFY OS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-white/60">
          Owner, Admin, and Employee access.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-sm text-white/50">
          Client portal?{" "}
          <Link href="/portal/login" className="text-brand hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </main>
  );
}
