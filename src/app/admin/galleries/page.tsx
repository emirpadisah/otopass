import Link from "next/link";
import { ArrowUpRight, Building2, Plus } from "lucide-react";
import {
  DataTable,
  ListControls,
  PaginationNav,
  PanelPageHeader,
  PanelSection,
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
import { parsePagination } from "@/lib/pagination";
import { listDealers } from "@/lib/supabase/queries";
import { DealerCreateForm } from "./DealerCreateForm";

type Params = { q?: string; status?: string; page?: string; pageSize?: string; sort?: string };

export default async function AdminGalleriesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const input = parsePagination(raw);
  const dealers = await listDealers();
  const query = input.q.toLocaleLowerCase("tr-TR");
  const filteredDealers = dealers
    .filter((dealer) => !input.status || (input.status === "active" ? dealer.is_active : !dealer.is_active))
    .filter((dealer) => !query || [dealer.name, dealer.slug, dealer.contact_email, dealer.legal_name].some((value) => value?.toLocaleLowerCase("tr-TR").includes(query)))
    .sort((a, b) => input.sort === "oldest" ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at));
  const pageCount = Math.max(1, Math.ceil(filteredDealers.length / input.pageSize));
  const visibleDealers = filteredDealers.slice((input.page - 1) * input.pageSize, input.page * input.pageSize);
  const exportQuery = new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Galeri ağı"
        title="Galeriler"
        description="Başvuru kabul edecek galerileri oluşturun, hesap durumlarını ve paylaşım adreslerini yönetin."
        icon={Building2}
        meta={<span className="ops-chip">{filteredDealers.length} kayıtlı galeri</span>}
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PanelSection
          title="Galeri listesi"
          description="Sistemde tanımlı galeriler ve başvuru kodları"
          icon={Building2}
          meta={<ListControls q={input.q} status={input.status} sort={input.sort} pageSize={input.pageSize} statuses={[{ value: "active", label: "Aktif" }, { value: "inactive", label: "Pasif" }]} exportHref={`/api/admin/export/galleries?${exportQuery}`} />}
          contentClassName="ops-section-flush"
        >
          <DataTable>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Galeri adı</TableHeaderCell>
                  <TableHeaderCell>Paylaşım kodu</TableHeaderCell>
                  <TableHeaderCell>İletişim</TableHeaderCell>
                  <TableHeaderCell>Durum</TableHeaderCell>
                  <TableHeaderCell className="text-right">İşlem</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {visibleDealers.map((dealer) => (
                  <TableRow key={dealer.id}>
                    <TableCell data-label="Galeri" className="whitespace-nowrap font-bold text-[var(--ops-text)]">{dealer.name}</TableCell>
                    <TableCell data-label="Paylaşım kodu" className="mono whitespace-nowrap text-xs">{dealer.slug}</TableCell>
                    <TableCell data-label="İletişim" className="whitespace-nowrap">{dealer.contact_email ?? "-"}</TableCell>
                    <TableCell data-label="Durum"><span className="ops-chip">{dealer.is_active ? "Aktif" : "Pasif"}</span></TableCell>
                    <TableCell data-label="İşlem" className="text-right"><Link href={`/admin/galleries/${dealer.id}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}>Yönet <ArrowUpRight size={14} /></Link></TableCell>
                  </TableRow>
                ))}
                {visibleDealers.length === 0 ? <TableEmptyState colSpan={5} message="Filtreye uygun galeri bulunamadı." /> : null}
              </TableBody>
            </Table>
          </DataTable>
          <PaginationNav pathname="/admin/galleries" page={input.page} pageCount={pageCount} params={{ q: input.q, status: input.status, sort: input.sort, pageSize: String(input.pageSize) }} />
        </PanelSection>

        <aside className="order-first xl:order-last xl:sticky xl:top-[102px] xl:self-start">
          <PanelSection
            title="Galeri ekle"
            description="Galeri ve standart başvuru adresi birlikte oluşturulur"
            icon={Plus}
          >
            <DealerCreateForm />
          </PanelSection>
        </aside>
      </div>
    </div>
  );
}
