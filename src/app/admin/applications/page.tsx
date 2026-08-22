import Link from "next/link";
import { ArrowUpRight, ClipboardList } from "lucide-react";
import { DataTable, ListControls, PaginationNav, PanelPageHeader, PanelSection, StatusBadge, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow, WhatsAppPhoneLink, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
import { parsePagination } from "@/lib/pagination";
import { listAdminApplications } from "@/lib/supabase/admin-lists";

type Params = { q?: string; status?: string; page?: string; pageSize?: string; sort?: string; deleted?: string; cleanup?: string };
const statuses = [{ value: "pending", label: "Bekleyen" }, { value: "offered", label: "Teklif" }, { value: "accepted", label: "Kabul" }, { value: "rejected", label: "Ret" }, { value: "sold", label: "Satıldı" }, { value: "archived", label: "Arşiv" }];

export default async function AdminApplicationsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const input = parsePagination(raw);
  const data = await listAdminApplications(input);
  const exportQuery = new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return <div><PanelPageHeader eyebrow="Yönetim / Operasyon" title="Başvurular" description="Tüm galerilerdeki araç başvurularını ve durumlarını izleyin." icon={ClipboardList} meta={<span className="ops-chip">{data.total} kayıt</span>} />
    {raw.deleted === "1" ? <div className="status-alert mt-4" data-tone={raw.cleanup === "pending" ? "warning" : "success"} role="status">{raw.cleanup === "pending" ? "Başvuru silindi. Tamamlanamayan fotoğraf temizliği teknik izlemeye kaydedildi." : "Başvuru, ilişkili teklifler ve fotoğraflar kalıcı olarak silindi."}</div> : null}
    <PanelSection className="mt-4" title="Başvuru dizini" description={`${data.items.length} kayıt gösteriliyor`} icon={ClipboardList} meta={<ListControls q={input.q} status={input.status} sort={input.sort} pageSize={input.pageSize} statuses={statuses} exportHref={`/api/admin/export/applications?${exportQuery}`} />} contentClassName="ops-section-flush">
      <DataTable><Table><TableHead><tr><TableHeaderCell>Referans</TableHeaderCell><TableHeaderCell>Galeri</TableHeaderCell><TableHeaderCell>Müşteri</TableHeaderCell><TableHeaderCell>Araç</TableHeaderCell><TableHeaderCell>Durum</TableHeaderCell><TableHeaderCell>Tarih</TableHeaderCell><TableHeaderCell /></tr></TableHead><TableBody>
        {data.items.map((item) => <TableRow key={item.id}><TableCell data-label="Referans" className="mono whitespace-nowrap text-xs">{item.reference_code}</TableCell><TableCell data-label="Galeri">{item.dealer_name}</TableCell><TableCell data-label="Müşteri"><strong>{item.owner_name}</strong><WhatsAppPhoneLink phone={item.owner_phone} className="mt-1" /></TableCell><TableCell data-label="Araç">{item.brand} {item.model}</TableCell><TableCell data-label="Durum"><StatusBadge status={item.status} /></TableCell><TableCell data-label="Tarih" className="whitespace-nowrap">{new Intl.DateTimeFormat("tr-TR").format(new Date(item.created_at))}</TableCell><TableCell data-label="İşlem"><Link href={`/admin/applications/${item.id}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")} aria-label={`${item.reference_code} başvurusunu aç`}><ArrowUpRight size={14} /></Link></TableCell></TableRow>)}
        {!data.items.length ? <TableEmptyState colSpan={7} message="Filtreye uygun başvuru bulunamadı." /> : null}
      </TableBody></Table></DataTable><PaginationNav pathname="/admin/applications" page={data.page} pageCount={data.pageCount} params={{ q: input.q, status: input.status, sort: input.sort, pageSize: String(input.pageSize) }} />
    </PanelSection></div>;
}
