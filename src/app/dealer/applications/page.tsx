import Link from "next/link";
import { ArrowUpRight, ClipboardList, SlidersHorizontal } from "lucide-react";
import {
  DataTable,
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
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { canManageDealerMembership } from "@/lib/auth/route";
import { getDealerForCurrentUser, listDealerApplications, listDealerOffers } from "@/lib/supabase/queries";
import { SoldButtonForm } from "./SoldButtonForm";

type StatusFilter = "all" | "pending" | "offered" | "sold";

type PageProps = {
  searchParams: Promise<{ status?: string }>;
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
  const { status } = await searchParams;
  const activeFilter: StatusFilter = ["pending", "offered", "sold"].includes(status ?? "")
    ? (status as StatusFilter)
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
    sold: applications.filter((application) => application.status === "sold").length,
  };
  const filteredApplications = activeFilter === "all"
    ? applications
    : applications.filter((application) => application.status === activeFilter);
  const filters: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "Tümü" },
    { key: "pending", label: "Bekleyen" },
    { key: "offered", label: "Teklif" },
    { key: "sold", label: "Alındı" },
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
        description={`${filteredApplications.length} kayıt gösteriliyor`}
        icon={SlidersHorizontal}
        meta={
          <nav className="ops-filter-tabs" aria-label="Başvuru durumu filtresi">
            {filters.map((filter) => (
              <Link
                key={filter.key}
                href={filter.key === "all" ? "/dealer/applications" : `/dealer/applications?status=${filter.key}`}
                className="ops-filter-tab"
                data-active={activeFilter === filter.key ? "true" : "false"}
                aria-current={activeFilter === filter.key ? "page" : undefined}
              >
                {filter.label}
                <span>{counts[filter.key]}</span>
              </Link>
            ))}
          </nav>
        }
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
              {filteredApplications.length === 0 ? (
                <TableEmptyState colSpan={6} message="Bu durumda başvuru bulunmuyor." />
              ) : (
                filteredApplications.map((application) => {
                  const latestOffer = latestOfferByApplication.get(application.id);
                  return (
                    <TableRow key={application.id}>
                      <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                        {application.owner_name ?? "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{application.brand} {application.model}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {application.model_year ?? "-"} / {application.km ?? "-"} km
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">
                        {latestOffer ? formatCurrency(latestOffer) : "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap"><StatusBadge status={application.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/dealer/applications/${application.id}`}
                            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
                            aria-label={`${application.brand} ${application.model} başvurusunu görüntüle`}
                          >
                            Görüntüle
                            <ArrowUpRight size={14} aria-hidden="true" />
                          </Link>
                          {canManage && application.status !== "sold" ? (
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
      </PanelSection>
    </div>
  );
}
