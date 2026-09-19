import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isClientRole } from "@/lib/roles";

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (isClientRole(session.user.role)) {
    redirect("/portal");
  }

  redirect("/dashboard");
}
