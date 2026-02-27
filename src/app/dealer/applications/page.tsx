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
import { getDealerForCurrentUser, listDealerApplications, listDealerOffers } from "@/lib/supabase/queries";
import { markApplicationAsSoldAction } from "./actions";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function DealerApplicationsPage() {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) {
    return null;
  }

  const [applications, offers] = await Promise.all([
    listDealerApplications(dealer.dealer_id),
    listDealerOffers(dealer.dealer_id),
  ]);

  const latestOfferByApplication = new Map<string, number>();
  for (const offer of offers) {
    if (!latestOfferByApplication.has(offer.application_id)) {
      latestOfferByApplication.set(offer.application_id, offer.amount);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-caption text-[var(--accent)]">Basvuru Havuzu</p>
        <h2 className="text-h2 mt-2">Basvurular</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Galeri hesabiniza atanan basvurular.</p>
      </header>

      <DataTable>
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Arac Sahibi</TableHeaderCell>
              <TableHeaderCell>Arac</TableHeaderCell>
              <TableHeaderCell>Yil / KM</TableHeaderCell>
              <TableHeaderCell>Son Teklif</TableHeaderCell>
              <TableHeaderCell>Durum</TableHeaderCell>
              <TableHeaderCell className="text-right">Islem</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {applications.length === 0 ? (
              <TableEmptyState colSpan={6} message="Atanmis basvuru bulunamadi." />
            ) : (
              applications.map((app) => {
                const latestOffer = latestOfferByApplication.get(app.id);

                return (
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
                    <TableCell className="whitespace-nowrap font-semibold text-[var(--text-primary)]">
                      {latestOffer ? formatCurrency(latestOffer) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge status={app.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/dealer/applications/${app.id}`}
                          className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
                        >
                          Goruntule
                          <ArrowUpRight size={14} />
                        </Link>

                        {app.status !== "sold" ? (
                          <form action={markApplicationAsSoldAction}>
                            <input type="hidden" name="applicationId" value={app.id} />
                            <button
                              type="submit"
                              className={cn(buttonVariants({ variant: "tonal", size: "sm" }), "inline-flex")}
                            >
                              Alindi Yap
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </DataTable>
    </div>
  );
}
