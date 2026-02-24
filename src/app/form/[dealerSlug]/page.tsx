import { notFound } from "next/navigation";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { FormClient } from "./FormClient";

type PageProps = {
  params: Promise<{ dealerSlug: string }>;
};

export default async function DealerPublicFormPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);

  if (!dealer) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white/95 shadow-xl">
        <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-zinc-100 px-6 py-6 sm:px-8 sm:py-8 md:border-b-0 md:border-r">
            <header className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                {dealer.name}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
                Vehicle Intake Form
              </h1>
              <p className="mt-2 text-sm text-zinc-500">
                Fill in your vehicle details to receive an estimated offer range.
              </p>
            </header>
            <FormClient dealerSlug={dealerSlug} />
          </div>
          <aside className="flex flex-col justify-between bg-zinc-950 px-6 py-6 text-zinc-100 sm:px-8 sm:py-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Secure valuation
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-snug">
                Fast and transparent dealer offers.
              </h2>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
