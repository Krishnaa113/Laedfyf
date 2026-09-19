import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadClientHub } from "@/lib/clients/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { canManageClientInvites } from "@/lib/roles";
import { ClientForm } from "@/components/clients/client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("clients", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  if (!auth.canAccessClient(id)) {
    notFound();
  }

  const hub = await loadClientHub(auth, id);
  if (!hub) {
    notFound();
  }

  const { client } = hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/clients/${client.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit client</h1>
        <p className="mt-1 text-sm text-white/60">{client.companyName}</p>
      </div>
      <ClientForm
        clientId={client.id}
        canRevealPassword={canManageClientInvites(auth.session.user.role)}
        currentPassword={
          "portalPassword" in client ? client.portalPassword : null
        }
        initialValues={{
          name: client.name,
          companyName: client.companyName,
          email: client.email,
          phone: client.phone,
          whatsapp: client.whatsapp,
          brandName: client.brandName,
          industry: client.industry,
          gstTaxId: client.gstTaxId,
          assignedEmployeeId: client.assignedEmployeeId ?? "",
          source: client.source,
          status: client.status,
          notes: client.notes,
        }}
      />
    </main>
  );
}
