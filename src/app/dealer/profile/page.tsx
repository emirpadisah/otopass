import Link from "next/link";
import { ExternalLink, Link2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { getDealerForCurrentUserWithDetails } from "@/lib/supabase/queries";

export default async function DealerProfilePage() {
  const dealer = await getDealerForCurrentUserWithDetails();

  return (
    <div className="space-y-5">
      <header>
        <p className="text-caption text-[var(--accent)]">Hesap Bilgileri</p>
        <h2 className="text-h2 mt-2">Profil</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">Galeri bilgileri ve başvuru linki.</p>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card tone="flat">
          <CardHeader>
            <CardTitle className="text-xl">Galeri Bilgileri</CardTitle>
            <CardDescription>Kayıtlı profil alanları</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2.5 text-sm">
              <div className="panel-subtle flex items-center justify-between p-3">
                <dt className="text-[var(--text-muted)]">Galeri Adı</dt>
                <dd className="font-semibold">{dealer?.name ?? "-"}</dd>
              </div>
              <div className="panel-subtle flex items-center justify-between p-3">
                <dt className="text-[var(--text-muted)]">İletişim E-postası</dt>
                <dd className="font-semibold">{dealer?.contact_email ?? "-"}</dd>
              </div>
              <div className="panel-subtle flex items-center justify-between p-3">
                <dt className="text-[var(--text-muted)]">Slug</dt>
                <dd className="mono text-xs font-semibold">{dealer?.slug ?? "-"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card tone="flat">
          <CardHeader>
            <CardTitle className="text-xl">Başvuru Linki</CardTitle>
            <CardDescription>Bu bağlantıyı müşterilerinizle paylaşabilirsiniz.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="panel-subtle flex items-center gap-2 p-3">
              <Link2 size={15} className="text-[var(--accent)]" />
              <p className="mono break-all text-xs text-[var(--text-secondary)]">
                {dealer ? `/form/${dealer.slug}` : "/form/<dealer-slug>"}
              </p>
            </div>

            {dealer ? (
              <Link
                href={`/form/${dealer.slug}`}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
              >
                Formu Aç
                <ExternalLink size={14} />
              </Link>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
