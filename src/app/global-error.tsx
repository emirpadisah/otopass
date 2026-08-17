"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="tr">
      <body>
        <main className="grid min-h-screen place-items-center p-6">
          <section className="panel max-w-md p-8 text-center">
            <h1 className="text-h1">Beklenmeyen bir hata oluştu</h1>
            <p className="mt-3 text-sm text-[var(--text-muted)]">İşlem kaydedildi. Sayfayı güvenli biçimde yeniden deneyebilirsiniz.</p>
            <Button className="mt-6" onClick={reset}>Tekrar Dene</Button>
          </section>
        </main>
      </body>
    </html>
  );
}
