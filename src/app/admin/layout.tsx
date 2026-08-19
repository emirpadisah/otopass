import type { Metadata } from "next";
import { ReactNode } from "react";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/app/login/actions";
import { AppShell, type AppShellNavItem } from "@/components/ui";

export const metadata: Metadata = {
  title: "Yönetim Paneli | POL-CAR",
  description: "Galerileri, kullanıcıları ve başvuruları yönetin.",
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
      sidebarTitle="Yönetim Paneli"
      sidebarSubtitle="Operasyon merkezi"
      headerTitle="Yönetim Konsolu"
      headerSubtitle="Kullanıcı, galeri ve başvuru süreçlerini tek noktadan yönetin."
      navItems={navItems}
      footerNote="Admin oturumu aktif"
      logoutAction={logout}
    >
      {children}
    </AppShell>
  );
}
