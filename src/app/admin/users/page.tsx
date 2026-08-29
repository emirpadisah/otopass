import Link from "next/link";
import { ArrowUpRight, UserPlus, UsersRound } from "lucide-react";
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
import { listAdminUsersPage, listDealerOptionsForAdmin } from "@/lib/supabase/queries";
import { UserCreateForm } from "./UserCreateForm";

type Params = { q?: string; status?: string; page?: string; pageSize?: string; sort?: string; created?: string; deleted?: string };
const roleLabels: Record<string, string> = {
  super_admin: "Süper yönetici",
  admin: "Yönetici",
  dealer_owner: "Galeri sahibi",
  dealer_manager: "Galeri yöneticisi",
  dealer_viewer: "Görüntüleyici",
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Params> }) {
  const raw = await searchParams;
  const input = parsePagination(raw);
  const [data, dealers] = await Promise.all([listAdminUsersPage(input), listDealerOptionsForAdmin()]);
  const visibleUsers = data.items;
  const exportQuery = new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Erişim"
        title="Kullanıcılar"
        description="Kullanıcı rollerini, galeri üyeliklerini ve hesap durumlarını yönetin."
        icon={UsersRound}
        meta={
          <>
            <span className="ops-chip">{data.total} kullanıcı</span>
            <span className="ops-chip">{data.passwordResetCount} ilk giriş bekliyor</span>
          </>
        }
      />

      {raw.created === "dealer" || raw.created === "admin" ? (
        <div className="status-alert mt-4" data-tone="success" role="status">
          {raw.created === "dealer"
            ? "Galeri hesabı oluşturuldu. Kullanıcı ilk girişte geçici şifresini değiştirecek."
            : "Yönetici hesabı başarıyla oluşturuldu."}
        </div>
      ) : null}

      {raw.deleted === "1" ? (
        <div className="status-alert mt-4" data-tone="success" role="status">
          Kullanıcı hesabı, rol ve galeri erişimleri kalıcı olarak silindi.
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <PanelSection
          title="Kullanıcı listesi"
          description="Roller, galeri üyelikleri ve hesap durumları"
          icon={UsersRound}
          meta={<ListControls q={input.q} status={input.status} sort={input.sort} pageSize={input.pageSize} statuses={[{ value: "active", label: "Aktif" }, { value: "inactive", label: "Pasif" }]} exportHref={`/api/admin/export/users?${exportQuery}`} />}
          contentClassName="ops-section-flush"
        >
          <DataTable>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>E-posta</TableHeaderCell>
                  <TableHeaderCell>Ad soyad</TableHeaderCell>
                  <TableHeaderCell>Roller</TableHeaderCell>
                  <TableHeaderCell>Galeri</TableHeaderCell>
                  <TableHeaderCell>Şifre durumu</TableHeaderCell>
                  <TableHeaderCell>Hesap</TableHeaderCell>
                  <TableHeaderCell className="text-right">İşlem</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell data-label="E-posta" className="whitespace-nowrap font-bold text-[var(--ops-text)]">{user.email ?? "-"}</TableCell>
                    <TableCell data-label="Ad soyad" className="whitespace-nowrap font-bold text-[var(--ops-text)]">{user.full_name ?? "-"}</TableCell>
                    <TableCell data-label="Roller" className="whitespace-nowrap">{user.roles.map((role) => roleLabels[role] ?? role).join(", ") || "-"}</TableCell>
                    <TableCell data-label="Galeri" className="whitespace-nowrap">
                      {user.dealer_ids
                        .map((dealerId) => dealers.find((dealer) => dealer.id === dealerId)?.name)
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell data-label="Şifre" className="whitespace-nowrap">
                      <span className="ops-chip">{user.must_change_password ? "Değişim zorunlu" : "Güncel"}</span>
                    </TableCell>
                    <TableCell data-label="Hesap"><span className="ops-chip">{user.is_active ? "Aktif" : "Pasif"}</span></TableCell>
                    <TableCell data-label="İşlem" className="text-right"><Link href={`/admin/users/${user.user_id}`} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}>Yönet <ArrowUpRight size={14} /></Link></TableCell>
                  </TableRow>
                ))}
                {visibleUsers.length === 0 ? <TableEmptyState colSpan={7} message="Filtreye uygun kullanıcı bulunamadı." /> : null}
              </TableBody>
            </Table>
          </DataTable>
          <PaginationNav pathname="/admin/users" page={data.page} pageCount={data.pageCount} params={{ q: input.q, status: input.status, sort: input.sort, pageSize: String(input.pageSize) }} />
        </PanelSection>

        <aside className="order-first xl:order-last xl:sticky xl:top-[102px] xl:self-start">
          <PanelSection
            title="Kullanıcı ekle"
            description="Hesap, rol ve galeri üyeliğini birlikte oluşturun"
            icon={UserPlus}
          >
            <UserCreateForm dealers={dealers.map((dealer) => ({ id: dealer.id, name: dealer.name }))} />
          </PanelSection>
        </aside>
      </div>
    </div>
  );
}
