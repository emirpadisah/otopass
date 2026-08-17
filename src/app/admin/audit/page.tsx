import { History } from "lucide-react";
import { DataTable, ListControls, PaginationNav, PanelPageHeader, PanelSection, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { parsePagination } from "@/lib/pagination";
import { listAdminActivity } from "@/lib/supabase/admin-lists";

type Params = { q?: string; page?: string; pageSize?: string; sort?: string };
export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const input = parsePagination(await searchParams);
  const data = await listAdminActivity(input);
  return <div><PanelPageHeader eyebrow="Yönetim / Güvenlik" title="İşlem geçmişi" description="Kritik kullanıcı, galeri, başvuru ve teklif hareketlerini denetlenebilir biçimde izleyin." icon={History} meta={<span className="ops-chip">{data.total} olay</span>} />
    <PanelSection className="mt-4" title="Audit olayları" icon={History} meta={<ListControls q={input.q} sort={input.sort} pageSize={input.pageSize} />} contentClassName="ops-section-flush"><DataTable><Table><TableHead><tr><TableHeaderCell>Zaman</TableHeaderCell><TableHeaderCell>Olay</TableHeaderCell><TableHeaderCell>Aktör</TableHeaderCell><TableHeaderCell>Galeri</TableHeaderCell><TableHeaderCell>Bağlam</TableHeaderCell></tr></TableHead><TableBody>
      {data.items.map((item) => <TableRow key={item.id}><TableCell data-label="Zaman" className="whitespace-nowrap">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</TableCell><TableCell data-label="Olay" className="font-bold">{item.action}</TableCell><TableCell data-label="Aktör" className="mono text-xs">{item.actor_user_id || "system"}</TableCell><TableCell data-label="Galeri" className="mono text-xs">{item.dealer_id || "-"}</TableCell><TableCell data-label="Bağlam"><code className="break-all text-xs">{JSON.stringify(item.metadata)}</code></TableCell></TableRow>)}
      {!data.items.length ? <TableEmptyState colSpan={5} message="Audit kaydı bulunamadı." /> : null}
    </TableBody></Table></DataTable><PaginationNav pathname="/admin/audit" page={data.page} pageCount={data.pageCount} params={{ q: input.q, sort: input.sort, pageSize: String(input.pageSize) }} /></PanelSection></div>;
}
