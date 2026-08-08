import type { Metadata } from "next";
import { KeyRound, ShieldCheck, UserCheck } from "lucide-react";
import { ThemeToggle } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Giriş | Otopass",
};

const trustItems = [
  {
    title: "Yetkili erişim",
    description: "Hesaplar admin tarafından oluşturulur ve rol bazlı yönlendirilir.",
    icon: UserCheck,
  },
  {
    title: "İlk giriş güvenliği",
    description: "Geçici şifreyle gelen kullanıcılar önce yeni şifre belirler.",
    icon: KeyRound,
  },
];

export default function LoginPage() {
  return (
    <div className="mx-auto grid min-h-screen w-full max-w-[1180px] items-center gap-4 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <section className="glass-highlight p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[var(--accent)] text-xs font-extrabold text-white shadow-[0_14px_28px_-18px_var(--accent-shadow)]"
            aria-hidden="true"
          >
            OP
          </span>
          <div>
            <p className="text-sm font-extrabold">OtoPass</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Araç alım operasyonu</p>
          </div>
        </div>
        <h1 className="text-display mt-4 max-w-xl">Operasyon paneline güvenli erişim.</h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-[var(--text-secondary)]">
          Admin ve galeri ekipleri, araç başvurularını ve teklif kararlarını tek güvenli oturum
          üzerinden yönetir.
        </p>

        <div className="mt-8 grid gap-3">
          {trustItems.map(({ title, description, icon: Icon }) => (
            <div key={title} className="panel-subtle flex items-start gap-3 p-4">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon size={16} aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-bold">{title}</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel w-full p-5 sm:p-7">
        <header className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="glass-chip">
              <ShieldCheck size={14} aria-hidden="true" />
              Güvenli oturum
            </div>
            <h2 className="text-h1 mt-3">Giriş Yap</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Yetkili kullanıcı hesabınızla devam edin.
            </p>
          </div>
          <ThemeToggle className="shrink-0" />
        </header>
        <LoginForm />
      </section>
    </div>
  );
}
