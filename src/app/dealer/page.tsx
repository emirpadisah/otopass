import { listDealerApplicationsForCurrentUser } from "@/lib/supabase/queries";

export default async function DealerDashboardPage() {
  const applications = await listDealerApplicationsForCurrentUser();
  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const offeredCount = applications.filter((a) => a.status === "offered").length;
  const soldCount = applications.filter((a) => a.status === "sold").length;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
        <p className="mt-1 text-sm text-zinc-500">Your assigned application pipeline.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pending</div>
          <div className="mt-2 text-2xl font-semibold">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Offered</div>
          <div className="mt-2 text-2xl font-semibold">{offeredCount}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Sold</div>
          <div className="mt-2 text-2xl font-semibold">{soldCount}</div>
        </div>
      </section>
    </div>
  );
}
