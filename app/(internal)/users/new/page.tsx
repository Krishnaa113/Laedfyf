import Link from "next/link";
import { requirePageAccess } from "@/lib/page-auth";
import { UserForm } from "@/components/users/user-form";

export default async function NewUserPage() {
  await requirePageAccess("users", "write");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <div>
        <Link href="/users" className="text-sm text-white/50 hover:text-brand">
          Back to users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Add user</h1>
      </div>
      <UserForm />
    </main>
  );
}
