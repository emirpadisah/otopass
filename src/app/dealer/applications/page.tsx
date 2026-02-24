import Link from "next/link";
import { listDealerApplicationsForCurrentUser } from "@/lib/supabase/queries";

export default async function DealerApplicationsPage() {
  const applications = await listDealerApplicationsForCurrentUser();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Applications</h2>
        <p className="mt-1 text-sm text-zinc-500">Applications assigned to your dealer account.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Owner
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Vehicle
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Year / KM
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-zinc-500">
                  No assigned applications.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">
                    {app.owner_name ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                    {app.brand} {app.model}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                    {app.model_year ?? "-"} / {app.km ?? "-"} km
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">{app.status}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <Link
                      href={`/dealer/applications/${app.id}`}
                      className="inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
