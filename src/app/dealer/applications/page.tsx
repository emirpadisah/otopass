import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  DataTable,
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
import { listDealerApplicationsForCurrentUser } from "@/lib/supabase/queries";

export default async function DealerApplicationsPage() {
  const applications = await listDealerApplicationsForCurrentUser();

  return (
    <div className="space-y-5">
      <header>
        <p className="text-caption text-[var(--accent)]">Başvuru Havuzu</p>
        <h2 className="text-h2 mt-2">Başvurular</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Galeri hesabınıza atanan başvurular.</p>
      </header>

      <DataTable>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Araç Sahibi</TableHeaderCell>
              <TableHeaderCell>Araç</TableHeaderCell>
              <TableHeaderCell>Yıl / KM</TableHeaderCell>
              <TableHeaderCell>Durum</TableHeaderCell>
              <TableHeaderCell className="text-right">İşlem</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {applications.length === 0 ? (
              <TableEmptyState colSpan={5} message="Atanmış başvuru bulunamadı." />
            ) : (
              applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="whitespace-nowrap font-semibold text-[var(--text-primary)]">
                    {app.owner_name ?? "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {app.brand} {app.model}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {app.model_year ?? "-"} / {app.km ?? "-"} km
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={app.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Link
                      href={`/dealer/applications/${app.id}`}
                      className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
                    >
                      Görüntüle
                      <ArrowUpRight size={14} />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTable>
    </div>
  );
}
