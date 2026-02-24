import { notFound } from "next/navigation";
import { getDealerApplicationForCurrentUser } from "@/lib/supabase/queries";
import { OfferForm } from "./OfferForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DealerApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const application = await getDealerApplicationForCurrentUser(id);
  if (!application) return notFound();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          {application.brand} {application.model}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Review details and create an offer.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <p>Owner: {application.owner_name ?? "-"}</p>
          <p>Phone: {application.owner_phone ?? "-"}</p>
          <p>Year: {application.model_year ?? "-"}</p>
          <p>KM: {application.km ?? "-"}</p>
          <p>Fuel: {application.fuel_type ?? "-"}</p>
          <p>Transmission: {application.transmission ?? "-"}</p>
          <p>Status: {application.status}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <OfferForm applicationId={application.id} />
        </div>
      </div>
    </div>
  );
}
