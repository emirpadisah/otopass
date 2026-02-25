"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";
import { ThemeToggle } from "./theme-toggle";

export type AppShellNavItem = {
  href: string;
  label: string;
};

type AppShellProps = {
  brandLabel?: string;
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
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "block rounded-2xl border px-3 py-2.5 text-sm font-semibold transition",
        active
          ? "border-[color:var(--accent-soft-strong)] bg-[var(--accent-soft)] text-[var(--accent)]"
          : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
      )}
    >
      {label}
    </Link>
  );
}

export function AppShell({
  brandLabel = "OTOPASS",
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

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1540px] grid-cols-1 gap-4 p-3 sm:p-4 lg:grid-cols-[280px_1fr] lg:gap-5">
        <aside className="panel ui-scrollbar hidden overflow-y-auto p-4 lg:flex lg:flex-col">
          <div className="mb-8">
            <p className="text-caption text-[var(--accent)]">{brandLabel}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{sidebarTitle}</h1>
            {sidebarSubtitle ? <p className="mt-2 text-sm muted">{sidebarSubtitle}</p> : null}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isItemActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="mt-auto space-y-3 pt-6">
            {footerNote ? <p className="text-xs muted">{footerNote}</p> : null}
            <ThemeToggle className="w-full justify-center" />
          </div>
        </aside>

        <div className="panel flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-col overflow-hidden sm:min-h-[calc(100vh-2rem)]">
          <header className="soft-divider sticky top-0 z-20 border-b bg-[color:color-mix(in_srgb,var(--surface-1)_88%,transparent)] px-3 py-3 backdrop-blur sm:px-5 lg:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
                  <Dialog.Trigger asChild>
                    <Button variant="secondary" size="sm" className="lg:hidden">
                      <Menu size={16} />
                    </Button>
                  </Dialog.Trigger>
                  <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
                    <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(85vw,330px)] flex-col border-r border-[var(--border-soft)] bg-[var(--surface-1)] p-4 shadow-2xl outline-none">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-caption text-[var(--accent)]">{brandLabel}</p>
                          <Dialog.Title className="mt-1 text-xl font-semibold tracking-tight">
                            {sidebarTitle}
                          </Dialog.Title>
                        </div>
                        <Dialog.Close asChild>
                          <Button variant="ghost" size="sm" aria-label="Menüyü kapat">
                            <X size={16} />
                          </Button>
                        </Dialog.Close>
                      </div>

                      <nav className="space-y-1">
                        {navItems.map((item) => (
                          <NavLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            active={isItemActive(pathname, item.href)}
                            onNavigate={() => setMobileOpen(false)}
                          />
                        ))}
                      </nav>

                      <div className="mt-auto space-y-3 border-t border-[var(--border-soft)] pt-4">
                        <ThemeToggle className="w-full justify-center" />
                        <form action={logoutAction}>
                          <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            className="w-full justify-center"
                          >
                            <LogOut size={15} />
                            Çıkış Yap
                          </Button>
                        </form>
                      </div>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog.Root>

                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">{headerTitle}</h2>
                  <p className="truncate text-xs muted sm:text-sm">{headerSubtitle}</p>
                </div>
              </div>

              <div className="hidden items-center gap-2 lg:flex">
                <ThemeToggle />
                <form action={logoutAction}>
                  <Button type="submit" variant="secondary" size="sm">
                    <LogOut size={15} />
                    Çıkış Yap
                  </Button>
                </form>
              </div>
            </div>
          </header>

          <main className="ui-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
