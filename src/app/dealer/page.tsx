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
import { getDealerForCurrentUser, listDealerApplications, listDealerOffers } from "@/lib/supabase/queries";

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

  const [applications, offers] = await Promise.all([
    listDealerApplications(dealer.dealer_id),
    listDealerOffers(dealer.dealer_id),
  ]);

  const pendingCount = applications.filter((application) => application.status === "pending").length;
  const offeredCount = applications.filter((application) => application.status === "offered").length;
  const soldCount = applications.filter((application) => application.status === "sold").length;
  const total = Math.max(1, applications.length);
  const totalOfferAmount = offers.reduce((sum, offer) => sum + offer.amount, 0);
  const averageOfferAmount = offers.length ? Math.round(totalOfferAmount / offers.length) : null;
  const recentOffers = offers.slice(0, 8);
  const applicationById = new Map(applications.map((application) => [application.id, application]));

  const metrics = [
    {
      label: "İnceleme kuyruğu",
      value: String(pendingCount),
      note: "Aksiyon bekleyen başvuru",
      icon: Clock3,
      tone: "warning" as const,
      progress: (pendingCount / total) * 100,
    },
    {
      label: "Teklif aşaması",
      value: String(offeredCount),
      note: "Aktif teklif sürecindeki araç",
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
      label: "Teklif adedi",
      value: String(offers.length),
      note: "Hesabın toplam teklif sayısı",
      icon: Wallet,
      progress: Math.min(100, (offers.length / total) * 100),
    },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="Galeri / Genel bakış"
        title="Araç alım masası"
        description="Atanan başvuruların hızını, teklif üretimini ve satın alma sonucunu aynı akışta yönetin."
        icon={Gauge}
        meta={
          <span className="ops-chip">
            <span className="ops-live-dot" aria-hidden="true" />
            {canManage ? "İşlem yetkisi aktif" : "Salt okunur erişim"}
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
        <PanelSection title="Durum akışı" description="Başvuruların operasyon aşamalarına dağılımı" icon={Gauge}>
          <ProcessRail
            items={[
              { label: "İnceleme", value: pendingCount, description: "Araç bilgileri kontrol ediliyor", tone: "warning" },
              { label: "Teklif", value: offeredCount, description: "Fiyatlandırma müşteriye hazır", tone: "accent" },
              { label: "Satın alma", value: soldCount, description: "Araç alım süreci tamamlandı", tone: "success" },
            ]}
          />
        </PanelSection>

        <PanelSection
          title="Son teklifler"
          description="En son oluşturulan fiyat hareketleri"
          icon={HandCoins}
          meta={<span className="ops-chip">Ort. {averageOfferAmount === null ? "-" : formatCurrency(averageOfferAmount)}</span>}
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
                        <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                          {application ? `${application.brand} ${application.model}` : "Başvuru"}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">
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
        </PanelSection>
      </div>
    </div>
  );
}
