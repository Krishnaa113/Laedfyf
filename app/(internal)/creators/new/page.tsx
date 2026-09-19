import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { CreatorForm } from "@/components/creators/creator-form";

export default async function NewCreatorPage() {
  await requirePageAccess("creators", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/creators" className="text-sm text-white/50 hover:text-brand">
          Back to creators
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add creator</h1>
        <p className="mt-1 text-sm text-white/60">
          Profile, rates, and payout details used when booking shoots.
        </p>
      </div>
      <CreatorForm />
    </main>
  );
}
