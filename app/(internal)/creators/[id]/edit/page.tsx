import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadCreatorHub } from "@/lib/creators/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { CreatorForm } from "@/components/creators/creator-form";

export default async function EditCreatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAccess("creators", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const hub = await loadCreatorHub(id, { includePayout: true });
  if (!hub) {
    notFound();
  }

  const { creator } = hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/creators/${creator.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to creator
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit creator</h1>
        <p className="mt-1 text-sm text-white/60">{creator.name}</p>
      </div>
      <CreatorForm
        creatorId={creator.id}
        initialValues={{
          name: creator.name,
          photoUrl: creator.photoUrl,
          gender: creator.gender,
          ageGroup: creator.ageGroup,
          languages: creator.languages.join("\n"),
          location: creator.location,
          niches: creator.niches.join("\n"),
          demographics: creator.demographics,
          email: creator.email,
          phone: creator.phone,
          rate: creator.rate,
          bankAccountName: creator.bankAccountName,
          bankAccountNumber: creator.bankAccountNumber,
          upiId: creator.upiId,
          portfolioLinks: creator.portfolioLinks.join("\n"),
          availability: creator.availability,
          isActive: creator.isActive,
        }}
      />
    </main>
  );
}
