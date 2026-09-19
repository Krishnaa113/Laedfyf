import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { ShootForm } from "@/components/shoots/shoot-form";

export default async function NewShootPage({
  searchParams,
}: {
  searchParams: Promise<{ creatorId?: string; clientId?: string }>;
}) {
  await requirePageAccess("shoots", "write");
  const { creatorId, clientId } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/shoots" className="text-sm text-white/50 hover:text-brand">
          Back to shoots
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Book shoot</h1>
        <p className="mt-1 text-sm text-white/60">
          The API blocks overlapping creator bookings and In Progress until the
          pre-shoot checklist is complete.
        </p>
      </div>
      <ShootForm
        lockCreator={Boolean(creatorId)}
        initialValues={{
          ...(creatorId ? { creatorId } : {}),
          ...(clientId ? { clientId } : {}),
        }}
      />
    </main>
  );
}
