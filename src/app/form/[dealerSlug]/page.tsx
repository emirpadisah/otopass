import { notFound } from "next/navigation";
import { Car, CheckCircle2, Clock3, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { FormClient } from "./FormClient";

type PageProps = {
  params: Promise<{ dealerSlug: string }>;
};

const points = [
  {
    title: "Hızlı Ön Değerlendirme",
    description: "Bilgileriniz galeri ekibine anlık iletilir.",
    icon: Clock3,
  },
  {
    title: "Güvenli Veri İşleme",
    description: "Fotoğraflar ve başvuru verileri güvenli şekilde saklanır.",
    icon: Shield,
  },
  {
    title: "Şeffaf Teklif Süreci",
    description: "Galeri geri dönüşü düzenli bir iş akışıyla ilerler.",
    icon: CheckCircle2,
  },
];

export default async function DealerPublicFormPage({ params }: PageProps) {
  const { dealerSlug } = await params;
  const dealer = await getDealerBySlug(dealerSlug);

  if (!dealer) {
    notFound();
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1380px] items-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid w-full gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="panel p-6 sm:p-8">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div>
              <p className="text-caption text-[var(--accent)]">{dealer.name}</p>
              <h1 className="text-h1 mt-2">Araç Başvuru Formu</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-muted)]">
                Yaklaşık teklif aralığı almak için araç bilgilerinizi eksiksiz doldurun.
              </p>
            </div>
            <ThemeToggle className="shrink-0" />
          </header>

          <FormClient dealerSlug={dealerSlug} />
        </section>

        <aside className="panel flex flex-col overflow-hidden p-6 sm:p-7">
          <div>
            <p className="text-caption text-[var(--accent)]">Güvenli Değerleme</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Aracınız için düzenli ve hızlı teklif süreci.
            </h2>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Formu tamamladıktan sonra başvurunuz sistemde kayıt altına alınır ve ilgili galeri
              tarafından değerlendirilir.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {points.map(({ title, description, icon: Icon }) => (
              <div key={title} className="panel-subtle flex items-start gap-3 p-4">
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-2 text-[var(--accent)]">
                  <Icon size={15} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-2)] p-4">
            <div className="flex items-center gap-2 text-[var(--accent)]">
              <Car size={16} />
              <span className="text-sm font-semibold">Başvuru Linki</span>
            </div>
            <p className="mono mt-2 break-all text-xs text-[var(--text-secondary)]">/form/{dealer.slug}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
