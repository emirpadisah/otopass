import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  FileText,
  Gauge,
  HandCoins,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import {
  MetricStrip,
  PanelPageHeader,
  PanelSection,
  ProcessRail,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { getDataMode } from "@/lib/data-mode";
import { getAdminDashboardCounts } from "@/lib/supabase/queries";

export default async function AdminDashboardPage() {
  const counts = await getAdminDashboardCounts();
  const dataMode = getDataMode();
  const maxCount = Math.max(1, counts.applications, counts.dealers, counts.offers);

  const metrics = [
    {
      label: "Toplam başvuru",
      value: String(counts.applications),
      note: "Sistemdeki araç başvuruları",
      icon: FileText,
      progress: (counts.applications / maxCount) * 100,
    },
    {
      label: "Kayıtlı galeri",
      value: String(counts.dealers),
      note: "Sisteme tanımlı işletmeler",
      icon: Building2,
      tone: "success" as const,
      progress: (counts.dealers / maxCount) * 100,
    },
    {
      label: "Toplam teklif",
      value: String(counts.offers),
      note: "Galeriler tarafından oluşturulan teklifler",
      icon: HandCoins,
      tone: "accent" as const,
      progress: (counts.offers / maxCount) * 100,
    },
  ];

  const pipeline = [
    {
      label: "Galeri tanımlandı",
      value: counts.dealers,
      description: "Sistemde kayıtlı galeri",
      tone: "neutral" as const,
    },
    {
      label: "Başvuru toplandı",
      value: counts.applications,
      description: "Değerlendirme havuzundaki araç kaydı",
      tone: "warning" as const,
    },
    {
      label: "Teklif üretildi",
      value: counts.offers,
      description: "Galeri tarafında oluşturulan teklif",
      tone: "accent" as const,
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Genel bakış"
        title="Sistem özeti"
        description="Galeri, araç başvurusu ve teklif sayılarını tek görünümden izleyin."
        icon={Gauge}
        meta={
          <span className="ops-chip">
            <span className="ops-live-dot" aria-hidden="true" />
            {dataMode === "local" ? "Yerel test verisi" : "Canlı veri"}
          </span>
        }
      />

      <MetricStrip metrics={metrics} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <PanelSection
          title="Kayıt akışı"
          description="Galeri, başvuru ve teklif sayılarının özeti"
          icon={Gauge}
          meta={<span className="ops-chip">Anlık görünüm</span>}
        >
          <ProcessRail items={pipeline} />
        </PanelSection>

        <div className="grid gap-4">
          <PanelSection title="Hızlı işlemler" description="En sık kullanılan yönetim adımları" icon={ArrowUpRight}>
            <div className="grid gap-2">
              <Link
                href="/admin/galleries"
                className={cn(buttonVariants({ variant: "primary", size: "md" }), "ops-quick-action-primary w-full justify-between")}
              >
                <span className="flex items-center gap-2"><Building2 size={16} aria-hidden="true" /> Galeri ekle</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <Link
                href="/admin/users"
                className={cn(buttonVariants({ variant: "secondary", size: "md" }), "w-full justify-between")}
              >
                <span className="flex items-center gap-2"><UserPlus size={16} aria-hidden="true" /> Kullanıcı ekle</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </PanelSection>

          <PanelSection title="Erişim kuralları" description="Hesaplar için uygulanan temel kontroller" icon={ShieldCheck}>
            <dl className="ops-info-list">
              <div className="ops-info-row"><dt>Kullanıcı oluşturma</dt><dd>Yönetici</dd></div>
              <div className="ops-info-row"><dt>Galeri ataması</dt><dd>Rol bazlı</dd></div>
              <div className="ops-info-row"><dt>İlk giriş</dt><dd>Şifre değişikliği zorunlu</dd></div>
            </dl>
          </PanelSection>
        </div>
      </div>
    </div>
  );
}
