import Link from "next/link";
import { ExternalLink, Globe2, ImageIcon, Link2, Store } from "lucide-react";
import { PanelPageHeader, PanelSection, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/cn";
import { getDealerDomainByDealerId, getDealerForCurrentUserWithDetails, getDealerForCurrentUser } from "@/lib/supabase/queries";
import { canManageDealerMembership } from "@/lib/auth/route";
import { getDealerLogoSrc } from "@/lib/dealer-branding";
import { isVercelDomainServiceConfigured } from "@/lib/vercel/domains";
import { ProfileForm } from "./ProfileForm";
import { DealerLogoManager } from "./DealerLogoManager";
import { DealerDomainManager } from "./DealerDomainManager";

export default async function DealerProfilePage() {
  const [dealer, membership] = await Promise.all([getDealerForCurrentUserWithDetails(), getDealerForCurrentUser()]);
  const domain = dealer ? await getDealerDomainByDealerId(dealer.id) : null;
  const canManage = canManageDealerMembership(membership?.role ?? "viewer");
  const brandingSchemaReady = domain !== undefined;

  return (
    <div>
      <PanelPageHeader
        eyebrow="Galeri / Kurumsal profil"
        title="Profil ve paylaşım"
        description="Galerinin sistem kimliğini ve müşteriye açılan başvuru kanalını yönetin."
        icon={Store}
        meta={<span className="ops-chip">Profil aktif</span>}
      />

      <div className="mt-4 grid gap-4">
        <PanelSection title="Galeri markası" description="Logo ve müşteriye gösterilen iletişim bilgileri" icon={ImageIcon}>
          {dealer ? (
            <div className="dealer-branding-layout">
              <DealerLogoManager dealerName={dealer.name} initialLogoSrc={getDealerLogoSrc(dealer)} canManage={canManage} serviceAvailable={brandingSchemaReady} />
              <div className="dealer-profile-fields"><ProfileForm dealer={dealer} canManage={canManage} /></div>
            </div>
          ) : <p>Galeri bulunamadı.</p>}
        </PanelSection>

        <div className="grid gap-4 xl:grid-cols-[.72fr_1.28fr]">
          <PanelSection title="Standart başvuru adresi" description="Platform üzerinde daima aktif kalan ana bağlantı" icon={Link2}>
            <div className="ops-link-display">
              <div>
                <p className="ops-eyebrow">Aktif form adresi</p>
                <p className="mono mt-2 break-all text-sm text-[var(--ops-text)]">{dealer ? `/form/${dealer.slug}` : "/form/<dealer-slug>"}</p>
              </div>
              {dealer ? (
                <Link href={`/form/${dealer.slug}`} className={cn(buttonVariants({ variant: "primary", size: "md" }), "inline-flex shrink-0")}>
                  Formu aç <ExternalLink size={14} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </PanelSection>
          <PanelSection title="Özel alan adı" description="Galerinizin kendi domaininden doğrudan başvuru alın" icon={Globe2}>
            <DealerDomainManager domain={domain ?? null} canManage={canManage} serviceConfigured={brandingSchemaReady && isVercelDomainServiceConfigured()} />
          </PanelSection>
        </div>
      </div>
    </div>
  );
}
