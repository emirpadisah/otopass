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
import { listDealers } from "@/lib/supabase/queries";
import { DealerCreateForm } from "./DealerCreateForm";

export default async function AdminGalleriesPage() {
  const dealers = await listDealers();

  return (
    <div className="space-y-5">
      <header>
        <p className="text-caption text-[var(--accent)]">Galeri Ağı</p>
        <h2 className="text-h2 mt-2">Galeriler</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Galeri kaydı oluşturun ve hesaplara galeri atayın.
        </p>
      </header>

      <DealerCreateForm />

      <DataTable>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Galeri Adı</TableHeaderCell>
              <TableHeaderCell>Slug</TableHeaderCell>
              <TableHeaderCell>İletişim</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {dealers.map((dealer) => (
              <TableRow key={dealer.id}>
                <TableCell className="whitespace-nowrap font-semibold text-[var(--text-primary)]">
                  {dealer.name}
                </TableCell>
                <TableCell className="whitespace-nowrap mono text-xs">{dealer.slug}</TableCell>
                <TableCell className="whitespace-nowrap">{dealer.contact_email ?? "-"}</TableCell>
              </TableRow>
            ))}
            {dealers.length === 0 ? <TableEmptyState colSpan={3} message="Galeri kaydı bulunamadı." /> : null}
          </TableBody>
        </Table>
      </DataTable>
    </div>
  );
}
