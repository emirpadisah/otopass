import type { Metadata } from "next";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { requireDealerAccess } from "@/lib/auth/roles";
import { getDealerForCurrentUserWithDetails } from "@/lib/supabase/queries";
import { requireUser } from "@/lib/auth/session";
import { AppShell, type AppShellNavItem } from "@/components/ui";

export const metadata: Metadata = {
  title: "Galeri Paneli | Otopass",
  description: "Gelen başvuruları yönetin ve teklif verin.",
};

const navItems: AppShellNavItem[] = [
  { href: "/dealer", label: "Genel Bakış" },
  { href: "/dealer/applications", label: "Başvurular" },
  { href: "/dealer/profile", label: "Profil" },
];

export default async function DealerLayout({ children }: { children: ReactNode }) {
  await requireUser();
  await requireDealerAccess();

  const dealer = await getDealerForCurrentUserWithDetails();
  if (!dealer) redirect("/");

  return (
    <AppShell
      sidebarTitle={dealer.name}
      sidebarSubtitle="Galeri operasyon alanı"
      headerTitle={dealer.name}
      headerSubtitle="Atanan başvuruları inceleyin ve teklif süreçlerini yönetin."
      navItems={navItems}
      footerNote="Galeri oturumu aktif"
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
