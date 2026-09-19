import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { loadScriptHub } from "@/lib/scripts/hub";
import { requirePageAccess } from "@/lib/page-auth";
import { ScriptForm } from "@/components/scripts/script-form";

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default async function EditScriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requirePageAccess("scripts", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const result = await loadScriptHub(auth, id);
  if (!result.ok) {
    notFound();
  }

  const { script } = result.hub;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link
          href={`/scripts/${script.id}`}
          className="text-sm text-white/50 hover:text-brand"
        >
          Back to script
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit script</h1>
        <p className="mt-1 text-sm text-white/60">
          Video #{script.videoNumber} · {script.companyName}
        </p>
      </div>
      <ScriptForm
        scriptId={script.id}
        lockClient
        clientLabel={script.companyName || script.clientName}
        initialValues={{
          clientId: script.clientId ?? "",
          orderId: script.orderId ?? "",
          videoNumber: script.videoNumber,
          writerId: script.writerId ?? "",
          creatorId: script.creatorId ?? "",
          language: script.language,
          scriptText: script.scriptText,
          referenceLinks: script.referenceLinks.join("\n"),
          deadline: toDateInput(script.deadline),
          status: script.status,
        }}
      />
    </main>
  );
}
