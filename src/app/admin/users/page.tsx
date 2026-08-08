import { UserPlus, UsersRound } from "lucide-react";
import {
  DataTable,
  PanelPageHeader,
  PanelSection,
  Table,
  TableBody,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui";
import { listDealers, listUsersForAdmin } from "@/lib/supabase/queries";
import { UserCreateForm } from "./UserCreateForm";

export default async function AdminUsersPage() {
  const [users, dealers] = await Promise.all([listUsersForAdmin(), listDealers()]);
  const passwordResetCount = users.filter((user) => user.must_change_password).length;

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Erişim"
        title="Kullanıcılar"
        description="Rol, galeri üyeliği ve ilk giriş güvenliğini tek erişim dizininden yönetin."
        icon={UsersRound}
        meta={
          <>
            <span className="ops-chip">{users.length} kullanıcı</span>
            <span className="ops-chip">{passwordResetCount} şifre yenileme</span>
          </>
        }
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <PanelSection
          title="Erişim dizini"
          description="Tüm roller ve bağlı galeri üyelikleri"
          icon={UsersRound}
          meta={<span className="ops-chip">{users.length} kayıt</span>}
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
                </tr>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.user_id}>
                    <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">{user.email ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">{user.full_name ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.roles.join(", ") || "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.dealer_ids
                        .map((dealerId) => dealers.find((dealer) => dealer.id === dealerId)?.name)
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="ops-chip">{user.must_change_password ? "Değişim zorunlu" : "Güncel"}</span>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 ? <TableEmptyState colSpan={5} message="Henüz kullanıcı kaydı yok." /> : null}
              </TableBody>
            </Table>
          </DataTable>
        </PanelSection>

        <aside className="order-first xl:order-last xl:sticky xl:top-[102px] xl:self-start">
          <PanelSection
            title="Kullanıcı tanımla"
            description="Rol ve üyelik tek güvenli adımda atanır"
            icon={UserPlus}
          >
            <UserCreateForm dealers={dealers.map((dealer) => ({ id: dealer.id, name: dealer.name }))} />
          </PanelSection>
        </aside>
      </div>
    </div>
  );
}
