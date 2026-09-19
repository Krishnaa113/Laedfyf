import Link from "next/link";
import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { requirePageAccess } from "@/lib/page-auth";
import { loadUserHub } from "@/lib/users/hub";
import { UserForm } from "@/components/users/user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePageAccess("users", "write");
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  const user = await loadUserHub(id);
  if (!user) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/users" className="text-sm text-white/50 hover:text-brand">
          Back to users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit {user.name}</h1>
      </div>
      <UserForm
        userId={user.id}
        initialValues={{
          name: user.name,
          email: user.email,
          role: user.role,
          employeeSubRole: user.employeeSubRole ?? "sales",
          permissions: user.permissions,
          isActive: user.isActive,
        }}
      />
    </main>
  );
}
