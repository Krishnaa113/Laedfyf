"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedVideo } from "@/lib/serialize";

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 16).replace("T", " ");
}

export function VideoFeedbackLog({
  videoId,
  entries,
  canComment,
}: {
  videoId: string;
  entries: SerializedVideo["feedbackLog"];
  canComment: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [timecode, setTimecode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Feedback cannot be empty.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/videos/${videoId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", body, timecode }),
    });
    const data = (await response.json()) as { error?: string };
    setPending(false);
    if (!response.ok) {
      setError(data.error || "Could not add feedback.");
      return;
    }
    setBody("");
    setTimecode("");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-white/10 p-6">
      <h2 className="text-lg font-medium">Client feedback log</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {entries.length === 0 ? (
          <li className="text-sm text-white/50">No feedback yet.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="rounded-md border border-white/10 p-3">
              <p className="text-xs text-white/40">
                {entry.authorName} · {entry.decision}
                {entry.timecode ? ` · ${entry.timecode}` : ""}
                {entry.createdAt ? ` · ${formatDate(entry.createdAt)}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{entry.body}</p>
            </li>
          ))
        )}
      </ul>
      {canComment ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <input
            value={timecode}
            onChange={(event) => setTimecode(event.target.value)}
            placeholder="Timecode (optional)"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="Add feedback"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {pending ? "Saving…" : "Add feedback"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
