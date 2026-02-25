import { CheckCircle2, Clock3, HandCoins, TimerReset } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { listDealerApplicationsForCurrentUser } from "@/lib/supabase/queries";

export default async function DealerDashboardPage() {
  const applications = await listDealerApplicationsForCurrentUser();
  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const offeredCount = applications.filter((a) => a.status === "offered").length;
  const soldCount = applications.filter((a) => a.status === "sold").length;

  const stats = [
    {
      label: "Bekleyen",
      value: pendingCount,
      icon: Clock3,
      note: "İnceleme bekleyen başvurular",
    },
    {
      label: "Teklif Verilen",
      value: offeredCount,
      icon: HandCoins,
      note: "Aktif teklif sürecindeki kayıtlar",
    },
    {
      label: "Satılan",
      value: soldCount,
      icon: CheckCircle2,
      note: "Satışa dönüşen başvurular",
    },
  ];

  return (
    <div className="space-y-5">
      <section>
        <p className="text-caption text-[var(--accent)]">Performans Özeti</p>
        <h2 className="text-h2 mt-2">Galeri Operasyon Durumu</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Atanan başvuruların güncel akışına göre dağılım.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, note }) => (
          <Card key={label} tone="flat" className="kpi-card border-0">
            <CardHeader className="flex items-start justify-between gap-3 space-y-0">
              <div>
                <CardDescription className="text-xs uppercase tracking-[0.09em]">{label}</CardDescription>
                <CardTitle className="mt-2 text-3xl">{value}</CardTitle>
              </div>
              <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-3)] p-2.5 text-[var(--accent)]">
                <Icon size={17} />
              </div>
            </CardHeader>
            <CardContent className="pt-3 text-xs text-[var(--text-muted)]">{note}</CardContent>
          </Card>
        ))}
      </section>

      <Card tone="outlined">
        <CardContent className="flex items-start gap-2 pt-0">
          <TimerReset size={16} className="mt-0.5 text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            Güncel teklif durumu için <span className="font-semibold">Başvurular</span> ekranını
            düzenli takip edin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
