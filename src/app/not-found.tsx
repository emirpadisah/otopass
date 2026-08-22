import Link from "next/link";
import { buttonVariants } from "@/components/ui";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center p-6"><section className="panel max-w-md p-8 text-center"><p className="section-label">404</p><h1 className="text-h1 mt-3">Sayfa bulunamadı</h1><p className="mt-3 text-sm text-[var(--text-muted)]">Adres hatalı olabilir veya bu sayfa artık kullanılamıyor olabilir.</p><Link href="/" className={`${buttonVariants()} mt-6 inline-flex`}>Ana sayfaya dön</Link></section></main>;
}
