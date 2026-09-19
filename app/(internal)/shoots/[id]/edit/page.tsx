import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadShootHub } from "@/lib/shoots/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { ShootForm } from "@/components/shoots/shoot-form";

function toDateTimeInput(value: string | null) {
  return value ? value.slice(0, 16) : "";
}

export default async function EditShootPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("shoots", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadShootHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { shoot } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/shoots/${shoot.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to shoot
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit shoot</h1>
        <p className="mt-1 text-sm text-white/60">{shoot.companyName}</p>
      </div>
      <ShootForm
        shootId={shoot.id}
        initialValues={{
          clientId: shoot.clientId ?? "",
          orderId: shoot.orderId ?? "",
          creatorId: shoot.creatorId ?? "",
          cameramanId: shoot.cameramanId ?? "",
          shootManagerId: shoot.shootManagerId ?? "",
          assistantId: shoot.assistantId ?? "",
          approvedScriptIds: shoot.approvedScriptIds,
          location: shoot.location,
          scheduledAt: toDateTimeInput(shoot.scheduledAt),
          endsAt: toDateTimeInput(shoot.endsAt),
          status: shoot.status,
          notes: shoot.notes,
          checklist: shoot.checklist,
        }}
      />
    </main>
  );
}
