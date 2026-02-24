import { getDealerForCurrentUserWithDetails } from "@/lib/supabase/queries";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export default async function DealerProfilePage() {
  const dealer = await getDealerForCurrentUserWithDetails();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
        <p className="mt-1 text-sm text-zinc-500">Dealer account details and intake link.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-semibold">Dealer Details</h3>
          <dl className="mt-3 space-y-2 text-sm text-zinc-700">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Dealer Name</dt>
              <dd className="font-medium">{dealer?.name ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Contact Email</dt>
              <dd className="font-medium">{dealer?.contact_email ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Slug</dt>
              <dd className="font-medium">{dealer?.slug ?? "-"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold">Intake Link</h3>
          <p className="mt-2 text-xs text-zinc-500">Share this link with customers to collect vehicle info.</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700">
              {dealer ? `/form/${dealer.slug}` : "/form/<dealer-slug>"}
            </div>
            {dealer && (
              <Link href={`/form/${dealer.slug}`} className="text-xs text-emerald-600">
                Open preview
              </Link>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
