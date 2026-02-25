import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Giriş | Otopass",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1200px] items-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid w-full gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel hidden min-h-[620px] overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-caption text-[var(--accent)]">OTOPASS</p>
            <h1 className="text-display mt-4 max-w-xl text-[2.6rem]">
              Profesyonel teklif süreçleri tek panelde.
            </h1>
            <p className="mt-4 max-w-lg text-[var(--text-secondary)]">
              Admin ve galeri ekipleri, araç başvurularını güvenli bir altyapıda yönetir; karar
              süreçlerini hızlandırır.
            </p>
          </div>

          <div className="panel-subtle flex items-start gap-3 p-4">
            <div className="mt-0.5 rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold">Güvenlik Notu</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Kullanıcı hesapları yalnızca admin tarafından oluşturulur ve ilk girişte şifre
                değişimi zorunludur.
              </p>
            </div>
          </div>
        </section>

        <section className="panel w-full max-w-xl justify-self-center p-6 sm:p-8 lg:max-w-none">
          <header className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="text-caption text-[var(--accent)]">Otopass Erişim</p>
              <h1 className="text-h1 mt-2">Giriş Yap</h1>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                Yetkili kullanıcı hesabınızla devam edin.
              </p>
            </div>
            <ThemeToggle className="shrink-0" />
          </header>
          <LoginForm />
        </section>
      </div>
    </div>
  );
}
