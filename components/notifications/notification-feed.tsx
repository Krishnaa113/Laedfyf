"use client";

import Link from "next/link";
import type { SerializedNotification } from "@/lib/notifications/hub";

function formatWhen(value: string | null) {
  if (!value) {
    return "—";
  }
  return value.slice(0, 16).replace("T", " ");
}

export function NotificationFeed({
  items,
}: {
  items: SerializedNotification[];
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 px-4 py-8 text-center text-sm text-white/50">
        No notifications yet.
      </p>
    );
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-white/10">
      {items.map((item) => (
        <li key={item.id} className="border-t border-white/10 first:border-t-0">
          <Link
            href={item.href || "#"}
            className={`block px-4 py-4 hover:bg-white/5 ${item.readAt ? "opacity-70" : ""}`}
          >
            <p className="text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-white/60">{item.body}</p>
            <p className="mt-2 text-xs text-white/40">
              {item.type} · {formatWhen(item.createdAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
