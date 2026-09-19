import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { ClientForm } from "@/components/clients/client-form";

export default async function NewClientPage() {
  await requirePageAccess("clients", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/clients" className="text-sm text-white/50 hover:text-brand">
          Back to clients
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add client</h1>
        <p className="mt-1 text-sm text-white/60">
          Capture company, assignment, source, and brand assets in one record.
        </p>
      </div>
      <ClientForm />
    </main>
  );
}
