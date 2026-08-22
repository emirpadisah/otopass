"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="ops-error-state" role="alert">
      <div>
        <span className="ops-error-icon"><AlertCircle size={20} aria-hidden="true" /></span>
        <h1 className="text-lg font-bold text-[var(--ops-text)]">Yönetim verileri yüklenemedi</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ops-muted)]">İnternet bağlantınızı kontrol edip sayfayı yeniden deneyin.</p>
        <Button type="button" className="mt-5" onClick={reset}><RotateCcw size={15} aria-hidden="true" /> Yeniden dene</Button>
      </div>
    </div>
  );
}
