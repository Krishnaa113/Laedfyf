import { requirePortalAccess } from "@/lib/page-auth";
import { loadNotificationFeed } from "@/lib/notifications/hub";
import { NotificationFeed } from "@/components/notifications/notification-feed";

export default async function PortalNotificationsPage() {
  const auth = await requirePortalAccess("notifications", "read");
  const feed = await loadNotificationFeed(auth.session.user.id, {
    audience: "portal",
    limit: 50,
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-white/60">
          Updates on scripts, videos, and invoices for your account.
        </p>
      </div>
      <NotificationFeed items={feed.notifications} />
    </main>
  );
}
