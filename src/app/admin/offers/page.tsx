import Link from "next/link";
import { HandCoins } from "lucide-react";
import { DataTable, ListControls, PaginationNav, PanelPageHeader, PanelSection, StatusBadge, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { parsePagination } from "@/lib/pagination";
import { listAdminOffers } from "@/lib/supabase/admin-lists";

type Params = { q?: string; status?: string; page?: string; pageSize?: string; sort?: string };
const statuses = [{ value: "pending", label: "Yanıt bekliyor" }, { value: "accepted", label: "Kabul edildi" }, { value: "rejected", label: "Reddedildi" }];

export default async function AdminOffersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const input = parsePagination(raw);
  const data = await listAdminOffers(input);
  const exportQuery = new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  return <div><PanelPageHeader eyebrow="Yönetim / Teklifler" title="Teklifler" description="Galerilerin oluşturduğu teklifleri ve kaydedilen müşteri yanıtlarını izleyin." icon={HandCoins} meta={<span className="ops-chip">{data.total} teklif</span>} />
    <PanelSection className="mt-4" title="Teklif listesi" icon={HandCoins} meta={<ListControls q={input.q} status={input.status} sort={input.sort} pageSize={input.pageSize} statuses={statuses} exportHref={`/api/admin/export/offers?${exportQuery}`} />} contentClassName="ops-section-flush"><DataTable><Table><TableHead><tr><TableHeaderCell>Başvuru</TableHeaderCell><TableHeaderCell>Galeri</TableHeaderCell><TableHeaderCell>Tutar</TableHeaderCell><TableHeaderCell>Durum</TableHeaderCell><TableHeaderCell>Yanıt tarihi</TableHeaderCell></tr></TableHead><TableBody>
      {data.items.map((item) => <TableRow key={item.id}><TableCell data-label="Başvuru" className="mono text-xs"><Link href={`/admin/applications/${item.application_id}`} className="text-[var(--accent)] hover:underline">{item.application_reference || item.application_id}</Link></TableCell><TableCell data-label="Galeri">{item.dealer_name}</TableCell><TableCell data-label="Tutar" className="font-bold">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: item.currency, maximumFractionDigits: 0 }).format(item.amount)}</TableCell><TableCell data-label="Durum"><StatusBadge status={item.status} /></TableCell><TableCell data-label="Yanıt tarihi">{item.responded_at ? new Intl.DateTimeFormat("tr-TR").format(new Date(item.responded_at)) : "-"}</TableCell></TableRow>)}
      {!data.items.length ? <TableEmptyState colSpan={5} message="Filtreye uygun teklif bulunamadı." /> : null}
    </TableBody></Table></DataTable><PaginationNav pathname="/admin/offers" page={data.page} pageCount={data.pageCount} params={{ q: input.q, status: input.status, sort: input.sort, pageSize: String(input.pageSize) }} /></PanelSection></div>;
}
