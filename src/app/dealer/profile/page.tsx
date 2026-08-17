import Link from "next/link";
import { ExternalLink, Link2, Store } from "lucide-react";
import { PanelPageHeader, PanelSection, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getDealerForCurrentUserWithDetails } from "@/lib/supabase/queries";
import { getDealerForCurrentUser } from "@/lib/supabase/queries";
import { canManageDealerMembership } from "@/lib/auth/route";
import { ProfileForm } from "./ProfileForm";

export default async function DealerProfilePage() {
  const [dealer, membership] = await Promise.all([getDealerForCurrentUserWithDetails(), getDealerForCurrentUser()]);

  return (
    <div>
      <PanelPageHeader
        eyebrow="Galeri / Kurumsal profil"
        title="Profil ve paylaşım"
        description="Galerinin sistem kimliğini ve müşteriye açılan başvuru kanalını yönetin."
        icon={Store}
        meta={<span className="ops-chip">Profil aktif</span>}
      />

      <div className="mt-4 grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
        <PanelSection title="Galeri kimliği" description="Sistemde kayıtlı kurumsal bilgiler" icon={Store}>
          {dealer ? <ProfileForm dealer={dealer} canManage={canManageDealerMembership(membership?.role ?? "viewer")} /> : <p>Galeri bulunamadı.</p>}
        </PanelSection>

        <PanelSection title="Müşteri başvuru kanalı" description="Bu adres galeriniz için ayrılmıştır" icon={Link2}>
          <div className="ops-link-display">
            <div>
              <p className="ops-eyebrow">Aktif form adresi</p>
              <p className="mono mt-2 break-all text-sm text-[var(--ops-text)]">
                {dealer ? `/form/${dealer.slug}` : "/form/<dealer-slug>"}
              </p>
            </div>
            {dealer ? (
              <Link
                href={`/form/${dealer.slug}`}
                className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-flex shrink-0")}
              >
                Formu aç <ExternalLink size={14} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </PanelSection>
      </div>
    </div>
  );
}
