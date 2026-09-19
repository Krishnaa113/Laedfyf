"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SerializedScript } from "@/lib/serialize";

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

export function ScriptComments({
  scriptId,
  comments,
  canComment,
}: {
  scriptId: string;
  comments: SerializedScript["comments"];
  canComment: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch(`/api/scripts/${scriptId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "comment", body }),
    });

    const data = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Could not add comment.");
      return;
    }

    setBody("");
    router.refresh();
  }

  return (
    <section className="rounded-lg border border-white/10 p-6">
      <h2 className="text-lg font-medium">Comments</h2>
      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-white/50">No comments yet.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium">
                  {comment.authorName}
                  {comment.authorRole ? (
                    <span className="ml-2 text-xs font-normal text-white/40">
                      {comment.authorRole}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-white/40">{formatDate(comment.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      )}
      {canComment ? (
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="Add a comment"
            className="rounded-md border border-white/15 bg-charcoal px-3 py-2 text-sm text-white outline-none focus:border-brand"
          />
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-md border border-white/15 px-4 py-2 text-sm hover:border-brand hover:text-brand disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
