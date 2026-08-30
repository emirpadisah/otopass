"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useTransition } from "react";
import { Download, Search } from "lucide-react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/cn";
import { announceNavigationStart } from "@/lib/navigation-feedback";

export function ListControls({ q, status, sort = "newest", pageSize = 25, statuses = [], exportHref }: { q?: string; status?: string; sort?: string; pageSize?: number; statuses?: Array<{ value: string; label: string }>; exportHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const normalized = String(value).trim();
      if (normalized) params.set(key, normalized);
    }
    announceNavigationStart("Filtrelenen kayıtlar yükleniyor");
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname));
  }

  return <form className="ops-list-controls" method="get" onSubmit={applyFilters} aria-busy={pending}>
    <label className="ops-search"><Search size={15} aria-hidden="true" /><span className="sr-only">Kayıtlarda ara</span><input name="q" defaultValue={q} placeholder="Kayıtlarda ara" /></label>
    {statuses.length ? <select name="status" defaultValue={status || ""} className="input-base" aria-label="Durum filtresi"><option value="">Tüm durumlar</option>{statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select> : null}
    <select name="sort" className="input-base" defaultValue={sort} aria-label="Sıralama"><option value="newest">En yeni</option><option value="oldest">En eski</option></select>
    <select name="pageSize" className="input-base" defaultValue={String(pageSize)} aria-label="Sayfa boyutu"><option value="10">10 kayıt</option><option value="25">25 kayıt</option><option value="50">50 kayıt</option><option value="100">100 kayıt</option></select>
    <button className={cn(buttonVariants({ size: "sm" }), "inline-flex")} type="submit" disabled={pending}>{pending ? "Yükleniyor…" : "Uygula"}</button>
    {exportHref ? <a href={exportHref} className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}><Download size={14} /> CSV indir</a> : null}
  </form>;
}

export function PaginationNav({ pathname, page, pageCount, params }: { pathname: string; page: number; pageCount: number; params: Record<string, string | undefined> }) {
  if (pageCount <= 1) return null;
  const href = (target: number) => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
    search.set("page", String(target));
    return `${pathname}?${search}`;
  };
  return <nav className="ops-pagination" aria-label="Sayfalama"><PaginationLink disabled={page <= 1} href={href(Math.max(1, page - 1))}>Önceki</PaginationLink><span>{page} / {pageCount}</span><PaginationLink disabled={page >= pageCount} href={href(Math.min(pageCount, page + 1))}>Sonraki</PaginationLink></nav>;
}

function PaginationLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  return <Link aria-disabled={disabled} href={href} prefetch={false} onClick={(event) => { if (disabled) event.preventDefault(); }}>
    {children}<PaginationPending />
  </Link>;
}

function PaginationPending() {
  const { pending } = useLinkStatus();
  return pending ? <span className="sr-only"> yükleniyor</span> : null;
}
