import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Gauge,
  HandCoins,
  Wallet,
} from "lucide-react";
import {
  DataTable,
  MetricStrip,
  PanelPageHeader,
  PanelSection,
  ProcessRail,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { canManageDealerMembership } from "@/lib/auth/route";
import { getDealerDashboardData, getDealerForCurrentUser } from "@/lib/supabase/queries";

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
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return null;
  const canManage = canManageDealerMembership(dealer.role);

  const { applications, offers, applicationCount, pendingCount, offeredCount, soldCount, offerCount } = await getDealerDashboardData(dealer.dealer_id);

  const total = Math.max(1, applicationCount);
  const totalOfferAmount = offers.reduce((sum, offer) => sum + offer.amount, 0);
  const averageOfferAmount = offers.length ? Math.round(totalOfferAmount / offers.length) : null;
  const recentOffers = offers.slice(0, 8);
  const applicationById = new Map(applications.map((application) => [application.id, application]));

  const metrics = [
    {
      label: "İnceleme bekleyen",
      value: String(pendingCount),
      note: "Henüz teklif oluşturulmamış başvuru",
      icon: Clock3,
      tone: "warning" as const,
      progress: (pendingCount / total) * 100,
    },
    {
      label: "Teklif verilen",
      value: String(offeredCount),
      note: "Yanıt veya satış işlemi bekleyen araç",
      icon: HandCoins,
      tone: "accent" as const,
      progress: (offeredCount / total) * 100,
    },
    {
      label: "Satın alınan",
      value: String(soldCount),
      note: "Alındı durumundaki araç",
      icon: CheckCircle2,
      tone: "success" as const,
      progress: (soldCount / total) * 100,
    },
    {
      label: "Toplam teklif",
      value: String(offerCount),
      note: "Oluşturulan teklif sayısı",
      icon: Wallet,
      progress: Math.min(100, (offerCount / total) * 100),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="Çalışma alanı / Genel bakış"
        title="Araç başvuruları"
        description="Atanan başvuruları, teklifleri ve tamamlanan satın alma işlemlerini tek görünümden izleyin."
        icon={Gauge}
        meta={
          <span className="ops-chip">
            <span className="ops-live-dot" aria-hidden="true" />
              {canManage ? "Düzenleme yetkisi" : "Salt okunur erişim"}
          </span>
        }
        actions={
          <Link
            href="/dealer/applications"
            className={cn(buttonVariants({ variant: "primary", size: "sm" }), "inline-flex")}
          >
            Başvurular
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        }
      />

      <MetricStrip metrics={metrics} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(300px,.72fr)_minmax(0,1.28fr)]">
        <PanelSection title="Başvuru durumu" description="Kayıtların mevcut aşamalara göre dağılımı" icon={Gauge}>
          <ProcessRail
            items={[
              { label: "İnceleme", value: pendingCount, description: "Teklif oluşturulması bekleniyor", tone: "warning" },
              { label: "Teklif", value: offeredCount, description: "Müşteri yanıtı veya sonuç bekleniyor", tone: "accent" },
              { label: "Tamamlandı", value: soldCount, description: "Satın alma işlemi kaydedildi", tone: "success" },
            ]}
          />
        </PanelSection>

        <PanelSection
          title="Son teklifler"
          description="En son oluşturulan teklifler"
          icon={HandCoins}
          meta={<span className="ops-chip">Son 8 ort. {averageOfferAmount === null ? "-" : formatCurrency(averageOfferAmount)}</span>}
          contentClassName="ops-section-flush"
        >
          <DataTable>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Araç</TableHeaderCell>
                  <TableHeaderCell>Tutar</TableHeaderCell>
                  <TableHeaderCell>Tarih</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {recentOffers.length === 0 ? (
                  <TableEmptyState colSpan={3} message="Henüz oluşturulmuş teklif bulunmuyor." />
                ) : (
                  recentOffers.map((offer) => {
                    const application = applicationById.get(offer.application_id);
                    return (
                      <TableRow key={offer.id}>
                        <TableCell data-label="Araç" className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                          {application ? `${application.brand} ${application.model}` : "Başvuru"}
                        </TableCell>
                        <TableCell data-label="Tutar" className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                          {formatCurrency(offer.amount)}
                        </TableCell>
                        <TableCell data-label="Tarih" className="whitespace-nowrap">{formatDate(offer.created_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </DataTable>
        </PanelSection>
      </div>
    </div>
  );
}
