import Link from "next/link";
import { ArrowRight, Building2, Gauge, ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ThemeToggle,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";

const highlights = [
  {
    title: "Güvenli Başvuru Süreci",
    description: "Müşteri verileri doğrulanır, fotoğraflar güvenli depoda saklanır.",
    icon: ShieldCheck,
  },
  {
    title: "Canlı Operasyon Görünümü",
    description: "Admin ve galeri panellerinde başvurular anlık olarak takip edilir.",
    icon: Gauge,
  },
  {
    title: "Kurumsal Galeri Ağı",
    description: "Tek link ile teklif toplama, değerlendirme ve aksiyon süreçleri hızlanır.",
    icon: Building2,
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1280px] flex-col px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-6 lg:px-8">
      <header className="mb-8 flex items-center justify-between rounded-3xl border border-[var(--border-soft)] bg-[color:color-mix(in_srgb,var(--surface-1)_88%,transparent)] px-4 py-3 backdrop-blur sm:px-5">
        <div>
          <p className="text-caption text-[var(--accent)]">OTOPASS</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Araç teklif ve operasyon platformu</p>
        </div>
        <ThemeToggle />
      </header>

      <main className="grid flex-1 items-start gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="panel relative overflow-hidden p-6 sm:p-8">
          <div className="absolute right-[-6rem] top-[-6rem] h-52 w-52 rounded-full bg-[var(--accent-soft-strong)] blur-3xl" />
          <p className="text-caption relative z-10 text-[var(--accent)]">Premium Workflow</p>
          <h1 className="text-display relative z-10 mt-3 max-w-3xl">
            Galeriler için profesyonel araç başvuru yönetimi.
          </h1>
          <p className="relative z-10 mt-4 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
            Otopass, müşteriden gelen araç başvurularını güvenli şekilde toplar; galerilere
            yapılandırılmış, hızlı ve takip edilebilir teklif operasyonu sunar.
          </p>

          <div className="relative z-10 mt-7 flex flex-wrap gap-3">
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "primary" }), "min-w-44 justify-center")}
            >
              Panele Giriş
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ size: "lg", variant: "secondary" }), "min-w-44 justify-center")}
            >
              Demo Talep Et
            </Link>
          </div>

          <div className="soft-divider mt-8 grid gap-3 border-t pt-5 sm:grid-cols-3">
            <div>
              <p className="text-2xl font-semibold">7/24</p>
              <p className="text-xs text-[var(--text-muted)]">Kesintisiz başvuru alımı</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">Çok Rol</p>
              <p className="text-xs text-[var(--text-muted)]">Admin + galeri ekip yönetimi</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">Anlık</p>
              <p className="text-xs text-[var(--text-muted)]">Teklif ve durum güncellemeleri</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {highlights.map(({ title, description, icon: Icon }) => (
            <Card key={title} tone="flat" className="h-full">
              <CardHeader>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-3)] text-[var(--accent)]">
                  <Icon size={18} />
                </div>
                <CardTitle className="mt-3 text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-2 text-sm text-[var(--text-muted)]">
                Süreçler tek bir panelde toplandığı için ekipler daha hızlı ve düzenli çalışır.
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
