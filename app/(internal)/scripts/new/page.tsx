import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { ScriptForm } from "@/components/scripts/script-form";

export default async function NewScriptPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; orderId?: string }>;
}) {
  await requirePageAccess("scripts", "write");
  const { clientId, orderId } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/scripts" className="text-sm text-white/50 hover:text-brand">
          Back to scripts
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add script</h1>
        <p className="mt-1 text-sm text-white/60">
          Draft starts here, then moves through review and client approval.
        </p>
      </div>
      <ScriptForm
        lockClient={Boolean(clientId)}
        initialValues={{
          ...(clientId ? { clientId } : {}),
          ...(orderId ? { orderId } : {}),
        }}
      />
    </main>
  );
}
