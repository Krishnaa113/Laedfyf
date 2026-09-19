"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedScript } from "@/lib/serialize";
import { ScriptComments } from "@/components/scripts/comment-thread";

export function ScriptReviewPanel({ script }: { script: SerializedScript }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approve" | "revision" | null>(null);
  const awaitingReview = script.status === "Sent to Client";

  async function review(action: "approve" | "revision") {
    if (pending) {
      return;
    }
    if (action === "revision" && !body.trim()) {
      setError("Add a comment so the writer knows why you are rejecting this draft.");
      return;
    }

    setPending(action);
    setError(null);

    const response = await fetch(`/api/scripts/${script.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, body }),
    });

    const data = (await response.json()) as { error?: string };
    setPending(null);

    if (!response.ok) {
      setError(data.error || "Could not submit review.");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {awaitingReview ? (
        <section className="rounded-lg border border-brand/30 bg-brand/5 p-6">
          <h2 className="text-lg font-medium">Review this script</h2>
          <p className="mt-1 text-sm text-white/60">
            Approve it for production, or reject it with timestamped notes.
          </p>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Optional note for approve · required to reject"
            className="mt-4 w-full rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => void review("approve")}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
            >
              {pending === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => void review("revision")}
              className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand disabled:opacity-60"
            >
              {pending === "revision" ? "Rejecting…" : "Reject"}
            </button>
          </div>
        </section>
      ) : (
        <p className="text-sm text-white/50">
          {script.status === "Approved" || script.status === "Ready for Shoot"
            ? "This script is approved."
            : script.status === "Revision Required"
              ? "Revision requested. The writer will send an updated draft."
              : "This script is not waiting on your review yet."}
        </p>
      )}

      <ScriptComments
        scriptId={script.id}
        comments={script.comments}
        canComment
      />
    </div>
  );
}
