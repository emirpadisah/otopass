"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  HandCoins,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Store,
  Users,
  X,
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
      className="ops-nav-link"
      data-active={active ? "true" : "false"}
    >
      <span className="ops-nav-icon">{Icon ? <Icon size={17} strokeWidth={1.8} aria-hidden="true" /> : null}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight className="ops-nav-arrow" size={14} aria-hidden="true" />
    </Link>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="ops-brand">
      <BrandLogo className="ops-brand-logo" size={compact ? "compact" : "navigation"} preload />
    </div>
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
      <Brand />

      <div className="ops-workspace-card">
        {brandLogoSrc ? (
          <span className="ops-workspace-logo" role="img" aria-label={`${title} logosu`}>
            <Image src={brandLogoSrc} alt="" fill sizes="42px" unoptimized />
          </span>
        ) : (
          <span className="ops-workspace-logo ops-workspace-logo-fallback" aria-hidden="true">
            <Store size={18} strokeWidth={1.8} />
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
  const [mobileOpen, setMobileOpen] = useState(false);
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

  return (
    <div className="ops-shell">
      <div className="ops-shell-grid" aria-hidden="true" />
      <div className="ops-layout">
        <aside className="ops-sidebar ui-scrollbar">
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
          <header className="ops-topbar">
            <div className="flex min-w-0 items-center gap-3">
              <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                <Dialog.Trigger asChild>
                  <Button variant="secondary" size="sm" className="h-10 w-10 px-0 lg:hidden" aria-label="Menüyü aç">
                    <Menu size={18} aria-hidden="true" />
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="ops-drawer-overlay" />
                  <Dialog.Content className="ops-drawer-content" aria-describedby={undefined}>
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <Dialog.Title className="sr-only">{sidebarTitle} menüsü</Dialog.Title>
                      <span className="ops-nav-label">Menü</span>
                      <Dialog.Close asChild>
                        <Button variant="ghost" size="sm" className="h-10 w-10 px-0" aria-label="Menüyü kapat">
                          <X size={18} aria-hidden="true" />
                        </Button>
                      </Dialog.Close>
                    </div>
                    <div className="ops-drawer-nav">
                      <ShellNav
                        brandLogoSrc={activeBrandLogoSrc}
                        title={sidebarTitle}
                        subtitle={sidebarSubtitle}
                        navItems={navItems}
                        pathname={pathname}
                        footerNote={footerNote}
                        logoutAction={logoutAction}
                        onNavigate={() => setMobileOpen(false)}
                      />
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>

              <div className="lg:hidden">
                <Brand compact />
              </div>
              <div className="hidden min-w-0 lg:block">
                {brandLabel ? (
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-[var(--ops-muted)]">
                    <span>{brandLabel}</span>
                    <ChevronRight size={12} aria-hidden="true" />
                    <span>{sidebarTitle}</span>
                  </div>
                ) : null}
                <p className={brandLabel ? "mt-1 truncate text-sm font-bold text-[var(--ops-text)]" : "truncate text-sm font-bold text-[var(--ops-text)]"}>{headerTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <p className="hidden max-w-md truncate text-xs text-[var(--ops-muted)] xl:block">{headerSubtitle}</p>
              <span className="ops-topbar-divider hidden sm:block" aria-hidden="true" />
              <ThemeToggle compact />
              <form action={logoutAction} className="hidden sm:block lg:hidden">
                <Button type="submit" variant="secondary" size="sm" className="h-10 w-10 px-0" aria-label="Çıkış yap" title="Çıkış yap">
                  <LogOut size={16} aria-hidden="true" />
                </Button>
              </form>
            </div>
          </header>

          <main className="ops-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
