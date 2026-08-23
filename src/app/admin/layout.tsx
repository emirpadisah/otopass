import type { Metadata } from "next";
import { ReactNode } from "react";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/app/login/actions";
import { AppShell, type AppShellNavItem } from "@/components/ui";

export const metadata: Metadata = {
  title: "Yönetim | otoköprü",
  description: "Galerileri, kullanıcıları, başvuruları ve teklifleri yönetin.",
};

const navItems: AppShellNavItem[] = [
  { href: "/admin", label: "Genel Bakış", icon: "dashboard" },
  { href: "/admin/galleries", label: "Galeriler", icon: "building" },
  { href: "/admin/users", label: "Kullanıcılar", icon: "users" },
  { href: "/admin/applications", label: "Başvurular", icon: "applications" },
  { href: "/admin/offers", label: "Teklifler", icon: "offers" },
  { href: "/admin/audit", label: "İşlem Geçmişi", icon: "audit" },
  { href: "/admin/settings", label: "Ayarlar", icon: "settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireUser();
  await requireAdminAccess();

  return (
    <AppShell
      brandLabel="otoköprü"
      sidebarTitle="Yönetim"
      sidebarSubtitle="Sistem ve erişim yönetimi"
      headerTitle="Yönetim"
      headerSubtitle="Galeri, kullanıcı ve başvuru süreçlerini tek noktadan yönetin."
      navItems={navItems}
      footerNote="Yetkili oturum"
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
