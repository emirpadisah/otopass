"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

export function TrackingRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") startTransition(() => router.refresh()); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-soft)] pt-5">
    <p className="text-xs text-[var(--text-muted)]" aria-live="polite">{pending ? "Güncel durum alınıyor…" : "Durum bu sayfa açıkken her dakika yenilenir."}</p>
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}><RefreshCw size={14} aria-hidden="true" /> Durumu yenile</Button>
  </div>;
}
