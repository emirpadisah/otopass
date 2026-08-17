import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, Link2, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui";
import { isLocalDataMode } from "@/lib/data-mode";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { FormClient } from "./FormClient";

type PageProps = {
  params: Promise<{ dealerSlug: string }>;
};

const points = [
  {
    title: "Hızlı ön değerlendirme",
    description: "Bilgileriniz galeri ekibine doğrudan iletilir.",
    icon: Clock3,
  },
  {
    title: "Güvenli veri işleme",
    description: "Fotoğraflar ve başvuru verileri güvenli şekilde saklanır.",
    icon: Shield,
  },
  {
    title: "Şeffaf teklif süreci",
    description: "Galeri geri dönüşü düzenli bir iş akışıyla ilerler.",
    icon: CheckCircle2,
  },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);

  return {
    title: dealer ? `${dealer.name} Araç Başvurusu | Otopass` : "Araç Başvurusu | Otopass",
    description: "Araç bilgilerinizi güvenli form üzerinden galeri değerlendirmesine gönderin.",
  };
}

export default async function DealerPublicFormPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);

  if (!dealer) {
    notFound();
  }

  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1380px] gap-4 px-4 py-6 sm:px-6 lg:px-8 xl:grid-cols-[1fr_380px]">
      <main className="panel p-5 sm:p-7">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="section-label">{dealer.name}</p>
            <h1 className="text-h1 mt-2">Araç başvuru formu</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
              Yaklaşık teklif aralığı almak için araç bilgilerinizi ve fotoğraflarınızı gönderin.
            </p>
          </div>
          <ThemeToggle className="shrink-0" />
        </header>

        <FormClient
          dealerSlug={dealerSlug}
          localMode={isLocalDataMode()}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null}
        />
      </main>

      <aside className="glass-highlight flex flex-col p-5 sm:p-6 xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
        <div>
          <p className="section-label">Güvenli Değerleme</p>
          <h2 className="mt-3 text-2xl font-bold">Aracınız için düzenli ve hızlı teklif süreci.</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Formu tamamladıktan sonra başvurunuz sistemde kayıt altına alınır ve ilgili galeri
            tarafından değerlendirilir.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {points.map(({ title, description, icon: Icon }) => (
            <div key={title} className="panel-subtle flex items-start gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon size={15} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="panel-subtle mt-auto p-4">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <Link2 size={16} aria-hidden="true" />
            <span className="text-sm font-bold">Başvuru Linki</span>
          </div>
          <p className="mono mt-2 break-all text-xs text-[var(--text-secondary)]">/form/{dealer.slug}</p>
        </div>
      </aside>
    </div>
  );
}
