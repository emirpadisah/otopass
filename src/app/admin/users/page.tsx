import {
  DataTable,
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

  return (
    <div className="space-y-5">
      <header>
        <p className="text-caption text-[var(--accent)]">Erişim Yönetimi</p>
        <h2 className="text-h2 mt-2">Kullanıcılar</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Admin tarafından oluşturulan kullanıcılar ve yetki eşleştirmeleri.
        </p>
      </header>

      <UserCreateForm dealers={dealers.map((d) => ({ id: d.id, name: d.name }))} />

      <DataTable>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Kullanıcı ID</TableHeaderCell>
              <TableHeaderCell>Ad Soyad</TableHeaderCell>
              <TableHeaderCell>Roller</TableHeaderCell>
              <TableHeaderCell>Şifre Değiştirme Zorunlu</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="mono text-xs">{user.user_id}</TableCell>
                <TableCell>{user.full_name ?? "-"}</TableCell>
                <TableCell>{user.roles.join(", ") || "-"}</TableCell>
                <TableCell>{user.must_change_password ? "Evet" : "Hayır"}</TableCell>
              </TableRow>
            ))}
            {users.length === 0 ? (
              <TableEmptyState colSpan={4} message="Kullanıcı kaydı bulunamadı." />
            ) : null}
          </TableBody>
        </Table>
      </DataTable>
    </div>
  );
}
