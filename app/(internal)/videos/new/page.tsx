import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { VideoForm } from "@/components/videos/video-form";

export default async function NewVideoPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; orderId?: string }>;
}) {
  await requirePageAccess("videos", "write");
  const { clientId, orderId } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/videos" className="text-sm text-white/50 hover:text-brand">
          Back to videos
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New video</h1>
        <p className="mt-1 text-sm text-white/60">
          Starts at Script Approved. Client approval delivers it and updates the order quota atomically.
        </p>
      </div>
      <VideoForm
        initialValues={{
          ...(clientId ? { clientId } : {}),
          ...(orderId ? { orderId } : {}),
        }}
      />
    </main>
  );
}
