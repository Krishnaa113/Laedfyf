import Link from "next/link";
import { pageCanWrite, requirePageAccess } from "@/lib/page-auth";
import { loadUserList } from "@/lib/users/hub";

export default async function UsersPage() {
  const auth = await requirePageAccess("users", "read");
  const canWrite = pageCanWrite(auth, "users");
  const users = await loadUserList();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users & RBAC</h1>
          <p className="mt-1 text-sm text-white/60">
            Owner-only staff accounts, roles, and permission grants.
          </p>
        </div>
        {canWrite ? (
          <Link
            href="/users/new"
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-charcoal"
          >
            Add user
          </Link>
        ) : null}
      </div>
      <section className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-white/60">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Permissions</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  {canWrite ? (
                    <Link href={`/users/${user.id}/edit`} className="hover:text-brand">
                      {user.name}
                    </Link>
                  ) : (
                    user.name
                  )}
                  <p className="mt-1 text-xs text-white/50">{user.email}</p>
                </td>
                <td className="px-4 py-3 text-white/70">
                  {user.role}
                  {user.employeeSubRole ? ` · ${user.employeeSubRole}` : ""}
                </td>
                <td className="px-4 py-3 text-white/70">{user.permissions.length}</td>
                <td className="px-4 py-3 text-white/70">
                  {user.isActive ? "Active" : "Inactive"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
