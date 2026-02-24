import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const [{ count: applicationsCount }, { count: dealersCount }, { count: offersCount }] =
    await Promise.all([
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("dealers").select("*", { count: "exact", head: true }),
      supabase.from("offers").select("*", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-semibold tracking-tight">Overview</h2>
        <p className="mt-1 text-sm text-zinc-500">Live stats from Supabase.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Applications</div>
          <div className="mt-2 text-2xl font-semibold">{applicationsCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Dealers</div>
          <div className="mt-2 text-2xl font-semibold">{dealersCount ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Offers</div>
          <div className="mt-2 text-2xl font-semibold">{offersCount ?? 0}</div>
        </div>
      </section>
    </div>
  );
}
