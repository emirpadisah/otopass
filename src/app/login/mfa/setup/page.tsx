import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUserRoles } from "@/lib/auth/roles";
import { resolveRouteForRoles } from "@/lib/auth/route";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { hasRequiredAssurance } from "@/lib/auth/mfa-policy";
import { logout } from "@/app/login/actions";
import { MfaSetup } from "./MfaSetup";
import { BrandLogo } from "@/components/brand-logo";
import { LoginThemeToggle } from "@/app/login/LoginThemeToggle";
import { LoginGradientMesh } from "@/app/login/LoginGradientMesh";
import styles from "@/app/login/login.module.css";

export const metadata: Metadata = { title: "İki adımlı doğrulama | otoköprü" };

export default async function MfaSetupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireAuthenticatedUser();
  const context = await getRequestAccessContext();
  const target = resolveRouteForRoles(await getCurrentUserRoles());
  if (target === "/login") redirect("/login");
  const passwordNext = (await searchParams).next === "password";
  if (context && hasRequiredAssurance(context.assurance, context.mfaExempt)) {
    redirect(context.mustChangePassword || passwordNext ? "/login/change-password" : target);
  }
  return <main className={styles.page}>
    <section className={styles.content}>
      <header className={styles.toolbar}>
        <Link href="/" className={styles.brandLink} aria-label="OtoKöprü ana sayfasına dön">
          <BrandLogo size="compact" preload />
        </Link>
        <LoginThemeToggle />
      </header>
      <div className={styles.formViewport}>
        <div className={styles.formShell}>
          <MfaSetup redirectTo={passwordNext ? "/login/mfa/setup?next=password" : "/login/mfa/setup"} />
          <form action={logout} className="mt-4 text-center"><button type="submit" className="text-sm underline">Çıkış yap</button></form>
        </div>
      </div>
      <p className={styles.footnote}>Hesabınızı korumak için doğrulama kodunuzu kimseyle paylaşmayın.</p>
    </section>
    <aside className={styles.meshPanel} aria-hidden="true">
      <LoginGradientMesh className={styles.mesh} />
    </aside>
  </main>;
}
