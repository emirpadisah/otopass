import { Building2, Plus } from "lucide-react";
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
import { listDealers } from "@/lib/supabase/queries";
import { DealerCreateForm } from "./DealerCreateForm";

export default async function AdminGalleriesPage() {
  const dealers = await listDealers();

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Galeri ağı"
        title="Galeriler"
        description="Başvuru kabul edecek işletmeleri oluşturun, kurumsal kimliklerini ve paylaşım adreslerini yönetin."
        icon={Building2}
        meta={<span className="ops-chip">{dealers.length} kayıtlı galeri</span>}
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PanelSection
          title="Galeri dizini"
          description="Sistemde başvuru bağlantısı bulunan işletmeler"
          icon={Building2}
          meta={<span className="ops-chip">{dealers.length} kayıt</span>}
          contentClassName="ops-section-flush"
        >
          <DataTable>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Galeri adı</TableHeaderCell>
                  <TableHeaderCell>Paylaşım kodu</TableHeaderCell>
                  <TableHeaderCell>İletişim</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {dealers.map((dealer) => (
                  <TableRow key={dealer.id}>
                    <TableCell className="whitespace-nowrap font-bold text-[var(--ops-text)]">{dealer.name}</TableCell>
                    <TableCell className="mono whitespace-nowrap text-xs">{dealer.slug}</TableCell>
                    <TableCell className="whitespace-nowrap">{dealer.contact_email ?? "-"}</TableCell>
                  </TableRow>
                ))}
                {dealers.length === 0 ? <TableEmptyState colSpan={3} message="Henüz galeri kaydı yok." /> : null}
              </TableBody>
            </Table>
          </DataTable>
        </PanelSection>

        <aside className="order-first xl:order-last xl:sticky xl:top-[102px] xl:self-start">
          <PanelSection
            title="Yeni galeri"
            description="Form ve başvuru adresi tek adımda hazırlanır"
            icon={Plus}
          >
            <DealerCreateForm />
          </PanelSection>
        </aside>
      </div>
    </div>
  );
}
