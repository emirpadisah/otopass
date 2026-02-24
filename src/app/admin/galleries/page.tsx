import { listDealers } from "@/lib/supabase/queries";

export default async function AdminGalleriesPage() {
  const dealers = await listDealers();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Dealers</h2>
        <p className="mt-1 text-sm text-zinc-500">Registered dealer organizations.</p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-zinc-200 text-sm">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Name
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Slug
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Contact
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 bg-white">
            {dealers.map((dealer) => (
              <tr key={dealer.id}>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-900">
                  {dealer.name}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">{dealer.slug}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-700">
                  {dealer.contact_email ?? "-"}
                </td>
              </tr>
            ))}
            {dealers.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-sm text-zinc-500">
                  No dealers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
