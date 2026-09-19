"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedVideo } from "@/lib/serialize";
import { VideoFeedbackLog } from "@/components/videos/feedback-log";

export function VideoReviewPanel({ video }: { video: SerializedVideo }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [timecode, setTimecode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"approve" | "revision" | null>(null);
  const awaitingReview = video.status === "Client Review";

  async function review(action: "approve" | "revision") {
    if (pending) {
      return;
    }
    if (action === "revision" && !body.trim()) {
      setError("Add feedback so the editor knows what to revise.");
      return;
    }
    setPending(action);
    setError(null);
    const response = await fetch(`/api/videos/${video.id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        body,
        timecode,
        finalDeliveryLink: video.finalDeliveryLink || video.fileLink,
      }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(null);
    if (!response.ok) {
      setError(data.error || "Could not submit review.");
      return;
    }
    setBody("");
    setTimecode("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {awaitingReview ? (
        <section className="rounded-lg border border-brand/30 bg-brand/5 p-6">
          <h2 className="text-lg font-medium">Review this video</h2>
          <p className="mt-1 text-sm text-white/60">
            Approve to deliver it against the order quota, or send it back for revision.
          </p>
          <input
            value={timecode}
            onChange={(event) => setTimecode(event.target.value)}
            placeholder="Timecode (optional)"
            className="mt-4 w-full rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="Optional note for approve · required for revision"
            className="mt-3 w-full rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => void review("approve")}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal disabled:opacity-60"
            >
              {pending === "approve" ? "Approving…" : "Approve & deliver"}
            </button>
            <button
              type="button"
              disabled={Boolean(pending)}
              onClick={() => void review("revision")}
              className="rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand disabled:opacity-60"
            >
              {pending === "revision" ? "Sending…" : "Request revision"}
            </button>
          </div>
        </section>
      ) : null}
      <VideoFeedbackLog videoId={video.id} entries={video.feedbackLog} canComment />
    </div>
  );
}
