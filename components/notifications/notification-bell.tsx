"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SerializedNotification } from "@/lib/notifications/hub";

function formatWhen(value: string | null) {
  if (!value) {
    return "";
  }
  return value.slice(0, 16).replace("T", " ");
}

export function NotificationBell({
  feedHref,
}: {
  feedHref: string;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<SerializedNotification[]>([]);

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications?limit=12");
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as {
      notifications?: SerializedNotification[];
      unreadCount?: number;
    };
    setItems(data.notifications ?? []);
    setUnreadCount(Number(data.unreadCount ?? 0));
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
      ),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setItems((current) =>
      current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    setUnreadCount(0);
  }

  async function openItem(item: SerializedNotification) {
    if (!item.readAt) {
      await markRead(item.id);
    }
    setOpen(false);
    if (item.href) {
      router.push(item.href);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          void load();
        }}
        className="relative flex h-9 items-center rounded-full border border-white/15 px-3 text-xs font-medium text-white/80 transition-colors hover:border-brand hover:text-brand"
        aria-label="Notifications"
      >
        Alerts
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] font-semibold text-charcoal">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-lg border border-white/10 bg-charcoal shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <p className="text-xs uppercase tracking-wide text-white/40">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-brand hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-white/50">
                No notifications yet.
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id} className="border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => void openItem(item)}
                    className={`flex w-full flex-col items-start gap-1 px-3 py-3 text-left hover:bg-white/5 ${
                      item.readAt ? "text-white/60" : "text-white"
                    }`}
                  >
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-white/50">{item.body}</span>
                    <span className="text-[11px] text-white/35">
                      {item.type} · {formatWhen(item.createdAt)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-white/10 px-3 py-2">
            <Link
              href={feedHref}
              onClick={() => setOpen(false)}
              className="text-xs text-brand hover:underline"
            >
              Open feed
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
