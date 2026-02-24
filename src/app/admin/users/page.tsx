import { listDealers, listUsersForAdmin } from "@/lib/supabase/queries";
import { UserCreateForm } from "./UserCreateForm";

export default async function AdminUsersPage() {
  const [users, dealers] = await Promise.all([listUsersForAdmin(), listDealers()]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Users</h2>
        <p className="mt-1 text-sm text-zinc-500">Admin-only user provisioning and access overview.</p>
      </header>

      <UserCreateForm dealers={dealers.map((d) => ({ id: d.id, name: d.name }))} />

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                User ID
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Roles
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Must Change Password
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {users.map((user) => (
              <tr key={user.user_id}>
                <td className="px-4 py-3 text-xs font-mono text-zinc-600">{user.user_id}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{user.full_name ?? "-"}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">{user.roles.join(", ") || "-"}</td>
                <td className="px-4 py-3 text-sm text-zinc-700">
                  {user.must_change_password ? "Yes" : "No"}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-zinc-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
