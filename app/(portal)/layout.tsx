import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isClientRole } from "@/lib/roles";
import { PortalHeader } from "@/components/portal-header";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const isPublicAuth =
    pathname === "/portal/login" || pathname.startsWith("/portal/set-password");

  if (session && !isClientRole(session.user.role) && !isPublicAuth) {
    redirect("/dashboard");
  }

  if (!session || isPublicAuth) {
    return <div className="flex min-h-full flex-col">{children}</div>;
  }

  return (
    <div className="flex min-h-full flex-col">
      <PortalHeader email={session.user.email} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
