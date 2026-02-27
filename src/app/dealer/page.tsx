import { CheckCircle2, Clock3, HandCoins, TimerReset, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { listDealerApplicationsForCurrentUser, listDealerOffersForCurrentUser } from "@/lib/supabase/queries";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function DealerDashboardPage() {
  const [applications, offers] = await Promise.all([
    listDealerApplicationsForCurrentUser(),
    listDealerOffersForCurrentUser(),
  ]);

  const pendingCount = applications.filter((a) => a.status === "pending").length;
  const offeredCount = applications.filter((a) => a.status === "offered").length;
  const soldCount = applications.filter((a) => a.status === "sold").length;

  const totalOfferAmount = offers.reduce((sum, offer) => sum + offer.amount, 0);
  const averageOfferAmount = offers.length > 0 ? Math.round(totalOfferAmount / offers.length) : null;
  const recentOffers = offers.slice(0, 8);

  const applicationById = new Map(applications.map((application) => [application.id, application]));

  const stats = [
    {
      label: "Bekleyen",
      value: String(pendingCount),
      icon: Clock3,
      note: "Inceleme bekleyen basvurular",
    },
    {
      label: "Teklif Verilen",
      value: String(offeredCount),
      icon: HandCoins,
      note: "Aktif teklif surecindeki kayitlar",
    },
    {
      label: "Toplam Alinan Arac",
      value: String(soldCount),
      icon: CheckCircle2,
      note: "Alindi durumuna cekilen arac sayisi",
    },
    {
      label: "Verilen Teklif",
      value: String(offers.length),
      icon: Wallet,
      note: "Galeri hesabinizin toplam teklif adedi",
    },
    {
      label: "Ortalama Teklif",
      value: averageOfferAmount === null ? "-" : formatCurrency(averageOfferAmount),
      icon: Wallet,
      note: "Tum tekliflerinizin ortalama tutari",
    },
  ];

  return (
    <div className="space-y-5">
      <section>
        <p className="text-caption text-[var(--accent)]">Performans Ozeti</p>
        <h2 className="text-h2 mt-2">Galeri Operasyon Durumu</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Atanan basvurularin ve tekliflerinizin guncel dagilimi.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
        <CardHeader>
          <CardTitle className="text-xl">Verdiginiz Teklif Fiyatlari</CardTitle>
          <CardDescription>En son olusturdugunuz teklif tutarlari.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Arac</TableHeaderCell>
                  <TableHeaderCell>Tutar</TableHeaderCell>
                  <TableHeaderCell>Tarih</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {recentOffers.length === 0 ? (
                  <TableEmptyState colSpan={3} message="Henuz olusturulmus teklif bulunmuyor." />
                ) : (
                  recentOffers.map((offer) => {
                    const application = applicationById.get(offer.application_id);
                    return (
                      <TableRow key={offer.id}>
                        <TableCell className="whitespace-nowrap font-semibold text-[var(--text-primary)]">
                          {application ? `${application.brand} ${application.model}` : "Basvuru"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-[var(--text-primary)]">
                          {formatCurrency(offer.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(offer.created_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTable>
        </CardContent>
      </Card>

      <Card tone="outlined">
        <CardContent className="flex items-start gap-2 pt-0">
          <TimerReset size={16} className="mt-0.5 text-[var(--accent)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            Basvurular ekranindan kayitlari <span className="font-semibold">Alindi Yap</span> ile hizlica
            guncelleyebilirsiniz.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
