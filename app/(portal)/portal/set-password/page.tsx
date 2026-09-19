import Link from "next/link";
import { loadInviteClient } from "@/lib/clients/invite";
import { SetPasswordForm } from "@/components/portal/set-password-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";
  const client = token ? await loadInviteClient(token) : null;

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-sm font-medium tracking-wide text-brand">LEADYFY OS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {client?.passwordSet ? "Reset password" : "Set your password"}
        </h1>
        {!client ? (
          <div className="mt-6 rounded-lg border border-white/10 p-4">
            <p className="text-sm text-red-400">
              This invite link is invalid or has expired.
            </p>
            <p className="mt-2 text-sm text-white/60">
              Contact the agency for a new link. Do not reuse an old message.
            </p>
            <Link
              href="/portal/login"
              className="mt-4 inline-block text-sm text-brand hover:underline"
            >
              Back to portal sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-white/60">{String(client.companyName)}</p>
            <SetPasswordForm token={token} passwordSet={Boolean(client.passwordSet)} />
          </>
        )}
      </div>
    </main>
  );
}
