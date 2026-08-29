import type { Metadata } from "next";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { requireDealerAccess } from "@/lib/auth/roles";
import { canManageDealerMembership } from "@/lib/auth/route";
import { getDealerForCurrentUser, getDealerForCurrentUserWithDetails } from "@/lib/supabase/queries";
import { getDealerLogoSrc } from "@/lib/dealer-branding";
import { AppShell, type AppShellNavItem } from "@/components/ui";

export const metadata: Metadata = {
  title: "Galeri hesabı | otoköprü",
  description: "Gelen başvuruları yönetin ve teklif verin.",
};

const navItems: AppShellNavItem[] = [
  { href: "/dealer", label: "Genel Bakış", icon: "dashboard" },
  { href: "/dealer/applications", label: "Başvurular", icon: "applications" },
  { href: "/dealer/profile", label: "Profil", icon: "store" },
  { href: "/dealer/security", label: "Güvenlik", icon: "settings" },
];

export default async function DealerLayout({ children }: { children: ReactNode }) {
  await requireDealerAccess();

  const [dealer, membership] = await Promise.all([
    getDealerForCurrentUserWithDetails(),
    getDealerForCurrentUser(),
  ]);
  if (!dealer || !membership) redirect("/");
  const canManage = canManageDealerMembership(membership.role);

  return (
    <AppShell
      brandLabel="otoköprü"
      brandLogoSrc={getDealerLogoSrc(dealer)}
      sidebarTitle={dealer.name}
      sidebarSubtitle="Başvuru ve teklif yönetimi"
      headerTitle={dealer.name}
      headerSubtitle={
        canManage
          ? "Atanan başvuruları inceleyin ve teklif süreçlerini yönetin."
          : "Atanan başvuruları ve mevcut teklif durumlarını inceleyin."
      }
      navItems={navItems}
      footerNote="Yetkili oturum"
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
