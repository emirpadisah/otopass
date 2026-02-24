import type { Metadata } from "next";
import Link from "next/link";
import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { requireDealerAccess } from "@/lib/auth/roles";
import { getDealerForCurrentUserWithDetails } from "@/lib/supabase/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Dealer Panel | Otopass",
  description: "Manage incoming applications and offers.",
};

const navItems = [
  { href: "/dealer", label: "Overview" },
  { href: "/dealer/applications", label: "Applications" },
  { href: "/dealer/profile", label: "Profile" },
];

export default async function DealerLayout({ children }: { children: ReactNode }) {
  await requireUser();
  await requireDealerAccess();
  const dealer = await getDealerForCurrentUserWithDetails();
  if (!dealer) redirect("/");

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white/80 px-4 py-6 shadow-sm backdrop-blur sm:flex sm:flex-col">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              OTOPASS
            </div>
            <div className="mt-1 text-lg font-semibold">{dealer.name}</div>
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
          <div className="mt-auto pt-6 text-xs text-zinc-400">Dealer session active</div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
            <div>
              <h1 className="text-base font-semibold tracking-tight">{dealer.name}</h1>
              <p className="text-xs text-zinc-500">Review assigned applications and place offers.</p>
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
