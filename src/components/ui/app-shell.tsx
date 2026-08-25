"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { DEALER_LOGO_UPDATED_EVENT } from "@/lib/dealer-branding";
import { Button } from "./button";
import { ThemeToggle } from "./theme-toggle";

export type AppShellNavItem = {
  href: string;
  label: string;
  icon?: "dashboard" | "building" | "users" | "settings" | "applications" | "offers" | "audit" | "store";
};

const navIcons: Record<NonNullable<AppShellNavItem["icon"]>, LucideIcon> = {
  dashboard: LayoutDashboard,
  building: Building2,
  users: Users,
  settings: Settings,
  applications: ClipboardList,
  offers: HandCoins,
  audit: History,
  store: Store,
};

type AppShellProps = {
  brandLabel?: string;
  brandLogoSrc?: string | null;
  sidebarTitle: string;
  sidebarSubtitle?: string;
  headerTitle: string;
  headerSubtitle: string;
  footerNote?: string;
  navItems: AppShellNavItem[];
  logoutAction: (formData: FormData) => Promise<void> | void;
  children: React.ReactNode;
};

function isItemActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dealer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: AppShellNavItem["icon"];
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = icon ? navIcons[icon] : undefined;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={label}
      className="ops-nav-link"
      data-active={active ? "true" : "false"}
    >
      <span className="ops-nav-icon">{Icon ? <Icon size={20} strokeWidth={1.8} aria-hidden="true" /> : null}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight className="ops-nav-arrow" size={14} aria-hidden="true" />
    </Link>
  );
}

function ShellNav({
  brandLogoSrc,
  title,
  subtitle,
  navItems,
  pathname,
  footerNote,
  logoutAction,
  onNavigate,
}: {
  brandLogoSrc?: string | null;
  title: string;
  subtitle?: string;
  navItems: AppShellNavItem[];
  pathname: string;
  footerNote?: string;
  logoutAction: AppShellProps["logoutAction"];
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="ops-workspace-card" data-custom-logo={brandLogoSrc ? "true" : "false"}>
        {brandLogoSrc ? (
          <span className="ops-workspace-logo" role="img" aria-label={`${title} logosu`}>
            <Image
              src={brandLogoSrc}
              alt=""
              fill
              sizes="42px"
              loading="eager"
              fetchPriority="high"
              unoptimized
            />
          </span>
        ) : (
          <span className="ops-workspace-logo ops-workspace-logo-fallback">
            <BrandLogo size="compact" preload />
          </span>
        )}
        <div className="min-w-0">
          <p className="ops-workspace-title">{title}</p>
          <p className="ops-workspace-subtitle">{subtitle ?? "Operasyon alanı"}</p>
        </div>
      </div>

      <nav className="mt-6" aria-label="Ana menü">
        <p className="ops-nav-label">Çalışma alanı</p>
        <div className="mt-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={isItemActive(pathname, item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="ops-sidebar-footer">
        {footerNote ? (
          <div className="ops-session-note">
            <span className="ops-live-dot" aria-hidden="true" />
            <span>{footerNote}</span>
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <ThemeToggle className="w-full justify-start" />
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="h-10 w-10 px-0"
              aria-label="Çıkış yap"
              title="Çıkış yap"
            >
              <LogOut size={16} aria-hidden="true" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  brandLabel = "otoköprü",
  brandLogoSrc,
  sidebarTitle,
  sidebarSubtitle,
  headerTitle,
  headerSubtitle,
  footerNote,
  navItems,
  logoutAction,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [activeBrandLogoSrc, setActiveBrandLogoSrc] = useState(brandLogoSrc);

  useEffect(() => {
    setActiveBrandLogoSrc(brandLogoSrc);
  }, [brandLogoSrc]);

  useEffect(() => {
    function handleDealerLogoUpdated(event: Event) {
      const logoSrc = (event as CustomEvent<{ logoSrc: string | null }>).detail?.logoSrc;
      setActiveBrandLogoSrc(logoSrc ?? null);
    }

    window.addEventListener(DEALER_LOGO_UPDATED_EVENT, handleDealerLogoUpdated);
    return () => window.removeEventListener(DEALER_LOGO_UPDATED_EVENT, handleDealerLogoUpdated);
  }, []);

  const activeNavigationItem = navItems.find((item) => isItemActive(pathname, item.href));
  const activeNavigationLabel = activeNavigationItem?.label ?? headerTitle;

  return (
    <div className="ops-shell">
      <div className="ops-shell-grid" aria-hidden="true" />
      <div className="ops-layout">
        <aside className="ops-sidebar ui-scrollbar" aria-label={`${sidebarTitle} navigasyonu`}>
          <ShellNav
            brandLogoSrc={activeBrandLogoSrc}
            title={sidebarTitle}
            subtitle={sidebarSubtitle}
            navItems={navItems}
            pathname={pathname}
            footerNote={footerNote}
            logoutAction={logoutAction}
          />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="ops-topbar" aria-label={headerSubtitle}>
            <div className="flex min-w-0 items-center gap-3">
              <span className="ops-mobile-page-label lg:hidden">{activeNavigationLabel}</span>
              <div className="hidden min-w-0 lg:block">
                {brandLabel ? (
                  <div className="ops-topbar-breadcrumb">
                    <span>{brandLabel}</span>
                    <ChevronRight size={12} aria-hidden="true" />
                    <span>{activeNavigationLabel}</span>
                  </div>
                ) : null}
              </div>
            </div>

          </header>

          <main className="ops-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
