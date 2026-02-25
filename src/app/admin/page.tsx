import { Building2, FileText, HandCoins, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const statsConfig = [
  { key: "applications", label: "Toplam Başvuru", icon: FileText },
  { key: "dealers", label: "Kayıtlı Galeri", icon: Building2 },
  { key: "offers", label: "Toplam Teklif", icon: HandCoins },
] as const;

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServiceClient();
  const [{ count: applicationsCount }, { count: dealersCount }, { count: offersCount }] =
    await Promise.all([
      supabase.from("applications").select("*", { count: "exact", head: true }),
      supabase.from("dealers").select("*", { count: "exact", head: true }),
      supabase.from("offers").select("*", { count: "exact", head: true }),
    ]);

  const statMap = {
    applications: applicationsCount ?? 0,
    dealers: dealersCount ?? 0,
    offers: offersCount ?? 0,
  };

  return (
    <div className="space-y-5">
      <section>
        <p className="text-caption text-[var(--accent)]">Genel Bakış</p>
        <h2 className="text-h2 mt-2">Canlı Operasyon Özeti</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Supabase verileri üzerinden güncel hacim ve etkileşim metrikleri.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {statsConfig.map(({ key, label, icon: Icon }) => (
          <Card key={key} tone="flat" className="kpi-card border-0">
            <CardHeader className="flex items-start justify-between gap-3 space-y-0">
              <div>
                <CardDescription className="text-xs uppercase tracking-[0.09em]">{label}</CardDescription>
                <CardTitle className="mt-2 text-3xl">{statMap[key]}</CardTitle>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-2.5 text-[var(--accent)]">
                <Icon size={17} />
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-2)] px-2.5 py-1 text-[0.69rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                <TrendingUp size={12} className="text-[var(--accent)]" />
                Canlı istatistik
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
