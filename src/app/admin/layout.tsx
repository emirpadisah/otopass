import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";
import { requireAdminAccess } from "@/lib/auth/roles";
import { requireUser } from "@/lib/auth/session";
import { logout } from "@/app/login/actions";

export const metadata: Metadata = {
  title: "Admin Panel | Otopass",
  description: "Manage dealers, users and applications.",
};

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/galleries", label: "Dealers" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireUser();
  await requireAdminAccess();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white/80 px-4 py-6 shadow-sm backdrop-blur sm:flex sm:flex-col">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              OTOPASS
            </div>
            <div className="mt-1 text-lg font-semibold">Admin Panel</div>
          </div>
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-6 text-xs text-zinc-400">Admin session active</div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div>
              <h1 className="text-base font-semibold tracking-tight">Admin Console</h1>
              <p className="text-xs text-zinc-500">Operate users, dealers and applications.</p>
            </div>
            <form action={logout}>
              <button className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-50 shadow-sm hover:bg-zinc-800">
                Logout
              </button>
            </form>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
