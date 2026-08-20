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
import { getDealerForCurrentUser, listDealerApplications, listDealerOffers } from "@/lib/supabase/queries";
import { SoldButtonForm } from "./SoldButtonForm";

type StatusFilter = "all" | "pending" | "offered" | "accepted" | "rejected" | "sold" | "archived";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; page?: string; pageSize?: string; sort?: string }>;
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
  const input = parsePagination(await searchParams);
  const activeFilter: StatusFilter = ["pending", "offered", "accepted", "rejected", "sold", "archived"].includes(input.status ?? "")
    ? (input.status as StatusFilter)
    : "all";

  const [applications, offers] = await Promise.all([
    listDealerApplications(dealer.dealer_id),
    listDealerOffers(dealer.dealer_id),
  ]);

  const latestOfferByApplication = new Map<string, number>();
  for (const offer of offers) {
    if (!latestOfferByApplication.has(offer.application_id)) {
      latestOfferByApplication.set(offer.application_id, offer.amount);
    }
  }

  const counts = {
    all: applications.length,
    pending: applications.filter((application) => application.status === "pending").length,
    offered: applications.filter((application) => application.status === "offered").length,
    accepted: applications.filter((application) => application.status === "accepted").length,
    rejected: applications.filter((application) => application.status === "rejected").length,
    sold: applications.filter((application) => application.status === "sold").length,
    archived: applications.filter((application) => application.status === "archived").length,
  };
  const statusFilteredApplications = activeFilter === "all"
    ? applications
    : applications.filter((application) => application.status === activeFilter);
  const query = input.q.toLocaleLowerCase("tr-TR");
  const filteredApplications = statusFilteredApplications
    .filter((application) => !query || [application.reference_code, application.owner_name, application.owner_phone, application.owner_email, application.brand, application.model]
      .some((value) => value?.toLocaleLowerCase("tr-TR").includes(query)))
    .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  const pageCount = Math.max(1, Math.ceil(filteredApplications.length / input.pageSize));
  const visibleApplications = filteredApplications.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);
  const statusOptions = [
    { value: "pending", label: `Bekleyen (${counts.pending})` },
    { value: "offered", label: `Teklif (${counts.offered})` },
    { value: "accepted", label: `Kabul (${counts.accepted})` },
    { value: "rejected", label: `Ret (${counts.rejected})` },
    { value: "sold", label: `Satıldı (${counts.sold})` },
    { value: "archived", label: `Arşiv (${counts.archived})` },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="Galeri / Başvuru havuzu"
        title="Başvurular"
        description={canManage
          ? "Araçları önceliğine göre inceleyin, teklif verin ve satın alma durumunu güncelleyin."
          : "Atanan araçları ve mevcut teklif durumlarını güvenli, salt okunur görünümde inceleyin."}
        icon={ClipboardList}
        meta={<span className="ops-chip">{applications.length} toplam başvuru</span>}
      />

      <PanelSection
        className="mt-4"
        title="Araç kuyruğu"
        description={`${visibleApplications.length} / ${filteredApplications.length} kayıt gösteriliyor`}
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
                <TableHeaderCell>Yıl / KM</TableHeaderCell>
                <TableHeaderCell>Son teklif</TableHeaderCell>
                <TableHeaderCell>Durum</TableHeaderCell>
                <TableHeaderCell className="text-right">İşlem</TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {visibleApplications.length === 0 ? (
                <TableEmptyState colSpan={6} message="Bu durumda başvuru bulunmuyor." />
              ) : (
                visibleApplications.map((application) => {
                  const latestOffer = latestOfferByApplication.get(application.id);
                  return (
                    <TableRow key={application.id}>
                      <TableCell data-label="Araç sahibi" className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                        {application.owner_name ?? "-"}
                        <WhatsAppPhoneLink phone={application.owner_phone} className="mt-1 font-normal" />
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
                            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
                            aria-label={`${application.brand} ${application.model} başvurusunu görüntüle`}
                          >
                            Görüntüle
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
        <PaginationNav pathname="/dealer/applications" page={input.page} pageCount={pageCount} params={{ q: input.q, status: input.status, sort: input.sort, pageSize: String(input.pageSize) }} />
      </PanelSection>
    </div>
  );
}
