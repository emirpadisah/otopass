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
            <p className="mt-3 text-sm text-[var(--text-muted)]">Sayfa şu anda tamamlanamıyor. Yeniden deneyin; sorun sürerse daha sonra tekrar gelin.</p>
            <Button className="mt-6" onClick={reset}>Yeniden dene</Button>
          </section>
        </main>
      </body>
    </html>
  );
}
