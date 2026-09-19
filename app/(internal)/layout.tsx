import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isInternalRole } from "@/lib/roles";
import { InternalHeader } from "@/components/internal-header";

export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!isInternalRole(session.user.role)) {
    redirect("/portal");
  }

  return (
    <div className="flex min-h-full flex-col">
      <InternalHeader
        user={{
          email: session.user.email,
          role: session.user.role,
          employeeSubRole: session.user.employeeSubRole ?? null,
          clientId: session.user.clientId ?? null,
          permissions: session.user.permissions ?? [],
        }}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
