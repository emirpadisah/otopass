import { History } from "lucide-react";
import { DataTable, ListControls, PaginationNav, PanelPageHeader, PanelSection, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow } from "@/components/ui";
import { parsePagination } from "@/lib/pagination";
import { listAdminActivity } from "@/lib/supabase/admin-lists";

type Params = { q?: string; page?: string; pageSize?: string; sort?: string };
const actionLabels: Record<string, string> = {
  ADMIN_DEALER_CREATED: "Galeri oluşturuldu",
  ADMIN_DEALER_UPDATED: "Galeri güncellendi",
  ADMIN_DEALER_DELETE_REQUESTED: "Galeri silme işlemi başlatıldı",
  ADMIN_DEALER_DELETED: "Galeri silindi",
  ADMIN_USER_CREATED: "Kullanıcı oluşturuldu",
  ADMIN_USER_DELETED: "Kullanıcı silindi",
  ADMIN_PASSWORD_RESET_SENT: "Şifre yenileme bağlantısı gönderildi",
  ADMIN_SETTINGS_UPDATED: "Sistem ayarları güncellendi",
  APPLICATION_CREATED: "Başvuru oluşturuldu",
  APPLICATION_DELETE_REQUESTED: "Başvuru silme işlemi başlatıldı",
  APPLICATION_DELETED: "Başvuru silindi",
  APPLICATION_ARCHIVED: "Başvuru arşivlendi",
  APPLICATION_PURGED: "Başvuru anonimleştirildi",
  DEALER_PROFILE_UPDATED: "Galeri profili güncellendi",
  DEALER_LOGO_UPDATED: "Galeri logosu güncellendi",
  DEALER_LOGO_REMOVED: "Galeri logosu kaldırıldı",
  DEALER_DOMAIN_ADDED: "Alan adı eklendi",
  DEALER_DOMAIN_CHECKED: "Alan adı kontrol edildi",
  DEALER_DOMAIN_REMOVED: "Alan adı kaldırıldı",
};

function formatAction(action: string) {
  return actionLabels[action] ?? action.toLocaleLowerCase("tr-TR").replaceAll("_", " ");
}

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Params> }) {
  const input = parsePagination(await searchParams);
  const data = await listAdminActivity(input);
  return <div><PanelPageHeader eyebrow="Yönetim / Güvenlik" title="İşlem geçmişi" description="Kullanıcı, galeri, başvuru ve sistem ayarı değişikliklerini izleyin." icon={History} meta={<span className="ops-chip">{data.total} kayıt</span>} />
    <PanelSection className="mt-4" title="Denetim kayıtları" icon={History} meta={<ListControls q={input.q} sort={input.sort} pageSize={input.pageSize} />} contentClassName="ops-section-flush"><DataTable><Table><TableHead><tr><TableHeaderCell>Tarih</TableHeaderCell><TableHeaderCell>İşlem</TableHeaderCell><TableHeaderCell>Kullanıcı</TableHeaderCell><TableHeaderCell>Galeri</TableHeaderCell><TableHeaderCell>Ayrıntı</TableHeaderCell></tr></TableHead><TableBody>
      {data.items.map((item) => <TableRow key={item.id}><TableCell data-label="Tarih" className="whitespace-nowrap">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</TableCell><TableCell data-label="İşlem" className="font-bold">{formatAction(item.action)}</TableCell><TableCell data-label="Kullanıcı" className="mono text-xs">{item.actor_user_id || "Sistem"}</TableCell><TableCell data-label="Galeri" className="mono text-xs">{item.dealer_id || "-"}</TableCell><TableCell data-label="Ayrıntı"><code className="break-all text-xs">{JSON.stringify(item.metadata)}</code></TableCell></TableRow>)}
      {!data.items.length ? <TableEmptyState colSpan={5} message="Denetim kaydı bulunamadı." /> : null}
    </TableBody></Table></DataTable><PaginationNav pathname="/admin/audit" page={data.page} pageCount={data.pageCount} params={{ q: input.q, sort: input.sort, pageSize: String(input.pageSize) }} /></PanelSection></div>;
}
