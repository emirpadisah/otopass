import Link from "next/link";
import { ArrowUpRight, ClipboardList, SlidersHorizontal } from "lucide-react";
import {
  DataTable,
  ListControls,
  PaginationNav,
  PanelPageHeader,
  PanelSection,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  WhatsAppPhoneLink,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { parsePagination } from "@/lib/pagination";
import { canManageDealerMembership } from "@/lib/auth/route";
import { getDealerForCurrentUser, listDealerApplicationPage } from "@/lib/supabase/queries";
import { SoldButtonForm } from "./SoldButtonForm";

type StatusFilter = "all" | "pending" | "offered" | "accepted" | "rejected" | "sold" | "archived";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; pageSize?: string; sort?: string; deleted?: string; cleanup?: string }>;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DealerApplicationsPage({ searchParams }: PageProps) {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) return null;
  const canManage = canManageDealerMembership(dealer.role);
  const rawParams = await searchParams;
  const input = parsePagination(rawParams);
  const activeFilter: StatusFilter = ["pending", "offered", "accepted", "rejected", "sold", "archived"].includes(input.status ?? "")
    ? (input.status as StatusFilter)
    : "all";

  const data = await listDealerApplicationPage(dealer.dealer_id, { ...input, status: activeFilter === "all" ? undefined : activeFilter });
  const counts = { all: Object.values(data.statusCounts).reduce((sum, count) => sum + count, 0), ...data.statusCounts };
  const visibleApplications = data.items;
  const statusOptions = [
    { value: "pending", label: `Bekleyen (${counts.pending})` },
    { value: "offered", label: `Teklif verildi (${counts.offered})` },
    { value: "accepted", label: `Kabul edildi (${counts.accepted})` },
    { value: "rejected", label: `Reddedildi (${counts.rejected})` },
    { value: "sold", label: `Satıldı (${counts.sold})` },
    { value: "archived", label: `Arşivlendi (${counts.archived})` },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="Çalışma alanı / Başvurular"
        title="Başvurular"
        description={canManage
          ? "Araç bilgilerini inceleyin, teklif oluşturun ve müşteri görüşmesinin sonucunu kaydedin."
          : "Atanan araçları ve mevcut teklif durumlarını salt okunur görünümde inceleyin."}
        icon={ClipboardList}
        meta={<span className="ops-chip">{counts.all} toplam başvuru</span>}
      />

      {rawParams.deleted === "1" ? (
        <div className="status-alert mt-4" data-tone={rawParams.cleanup === "pending" ? "warning" : "success"} role="status">
          {rawParams.cleanup === "pending"
            ? "Başvuru silindi. Bazı fotoğraflar arka planda silinmeye devam ediyor."
            : "Başvuru, ilişkili teklifler ve fotoğraflar kalıcı olarak silindi."}
        </div>
      ) : null}

      <PanelSection
        className="mt-4"
        title="Başvuru listesi"
        description={`${data.total} kayıttan ${visibleApplications.length} tanesi gösteriliyor`}
        icon={SlidersHorizontal}
        meta={<ListControls q={input.q} status={input.status} sort={input.sort} pageSize={input.pageSize} statuses={statusOptions} />}
        contentClassName="ops-section-flush"
      >
        <DataTable>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Araç sahibi</TableHeaderCell>
                <TableHeaderCell>Araç</TableHeaderCell>
                <TableHeaderCell>Yıl / km</TableHeaderCell>
                <TableHeaderCell>Son teklif</TableHeaderCell>
                <TableHeaderCell>Durum</TableHeaderCell>
                <TableHeaderCell className="text-right">İşlem</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {visibleApplications.length === 0 ? (
                <TableEmptyState colSpan={6} message="Seçili filtrelere uygun başvuru bulunamadı." />
              ) : (
                visibleApplications.map((application) => {
                  const latestOffer = data.latestOfferByApplication[application.id];
                  return (
                    <TableRow key={application.id}>
                      <TableCell data-label="Araç sahibi" className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                        <div className="ops-application-owner">
                          <span>{application.owner_name ?? "-"}</span>
                          <WhatsAppPhoneLink phone={application.owner_phone} className="font-normal" />
                        </div>
                      </TableCell>
                      <TableCell data-label="Araç" className="whitespace-nowrap">{application.brand} {application.model}</TableCell>
                      <TableCell data-label="Yıl / KM" className="whitespace-nowrap">
                        {application.model_year ?? "-"} / {application.km ?? "-"} km
                      </TableCell>
                      <TableCell data-label="Son teklif" className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                        {latestOffer ? formatCurrency(latestOffer) : "-"}
                      </TableCell>
                      <TableCell data-label="Durum" className="whitespace-nowrap"><StatusBadge status={application.status} /></TableCell>
                      <TableCell data-label="İşlem" className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/dealer/applications/${application.id}`}
                            prefetch={false}
                            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
                            aria-label={`${application.brand} ${application.model} başvurusunu görüntüle`}
                            data-navigation-label="Araç incelemesi açılıyor"
                          >
                            İncele
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </Link>
                          {canManage && application.status === "accepted" ? (
                            <SoldButtonForm applicationId={application.id} />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </DataTable>
        <PaginationNav pathname="/dealer/applications" page={data.page} pageCount={data.pageCount} params={{ q: input.q, status: input.status, sort: input.sort, pageSize: String(input.pageSize) }} />
      </PanelSection>
    </div>
  );
}
