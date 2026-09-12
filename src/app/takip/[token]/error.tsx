"use client";
import { Button } from "@/components/ui";
export default function TrackingError({ reset }: { reset: () => void }) {
  return <main className="mx-auto grid min-h-[70svh] max-w-lg content-center gap-5 p-6"><h1 className="text-2xl font-semibold">Başvuru durumu alınamadı</h1><p>Geçici bir bağlantı sorunu oluştu. Lütfen tekrar deneyin.</p><Button onClick={reset}>Tekrar dene</Button></main>;
}
