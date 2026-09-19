import { SiteHeader } from "@/components/site-header";

const LINKS = [
  { href: "/portal", label: "Home" },
  { href: "/portal/orders", label: "Orders" },
  { href: "/portal/scripts", label: "Scripts" },
  { href: "/portal/videos", label: "Videos" },
  { href: "/portal/deliveries", label: "Deliveries" },
  { href: "/portal/invoices", label: "Invoices" },
  { href: "/portal/tickets", label: "Support" },
];

export function PortalHeader({
  email,
}: {
  email?: string | null;
}) {
  return (
    <SiteHeader
      homeHref="/portal"
      links={LINKS}
      userLabel={email}
      roleLabel="client"
      feedHref="/portal/notifications"
      signOutTo="/portal/login"
    />
  );
}
