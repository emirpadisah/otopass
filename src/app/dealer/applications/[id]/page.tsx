import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, StatusBadge } from "@/components/ui";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDealerApplicationForCurrentUser } from "@/lib/supabase/queries";
import { OfferForm } from "./OfferForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatNumber(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("tr-TR").format(value);
}

async function getSignedPhotoUrls(photoPaths: string[]): Promise<string[]> {
  if (photoPaths.length === 0) return [];
  const supabase = createSupabaseServiceClient();

  const signedUrls = await Promise.all(
    photoPaths.map(async (path) => {
      const { data, error } = await supabase.storage.from("applications").createSignedUrl(path, 300);
      if (error || !data?.signedUrl) return null;
      return data.signedUrl;
    })
  );

  return signedUrls.filter((url): url is string => Boolean(url));
}

export default async function DealerApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const application = await getDealerApplicationForCurrentUser(id);
  if (!application) return notFound();

  const photoUrls = await getSignedPhotoUrls(application.photo_paths ?? []);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-caption text-[var(--accent)]">Başvuru Detayı</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h2">
            {application.brand} {application.model}
          </h1>
          <StatusBadge status={application.status} />
        </div>
        <p className="text-sm text-[var(--text-muted)]">Detayları inceleyip teklifinizi oluşturun.</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card tone="flat">
          <CardHeader>
            <CardTitle className="text-xl">Araç ve Müşteri Bilgileri</CardTitle>
            <CardDescription>Başvuru sırasında iletilen bilgiler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Araç Sahibi</dt>
                <dd className="mt-1 text-sm font-semibold">{application.owner_name ?? "-"}</dd>
              </div>
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Telefon</dt>
                <dd className="mt-1 text-sm font-semibold">{application.owner_phone ?? "-"}</dd>
              </div>
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Model Yılı</dt>
                <dd className="mt-1 text-sm font-semibold">{application.model_year ?? "-"}</dd>
              </div>
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Araç Paketi</dt>
                <dd className="mt-1 text-sm font-semibold">{application.vehicle_package ?? "-"}</dd>
              </div>
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Kilometre</dt>
                <dd className="mt-1 text-sm font-semibold">{formatNumber(application.km)} km</dd>
              </div>
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Yakıt</dt>
                <dd className="mt-1 text-sm font-semibold">{application.fuel_type ?? "-"}</dd>
              </div>
              <div className="panel-subtle p-3">
                <dt className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Vites</dt>
                <dd className="mt-1 text-sm font-semibold">{application.transmission ?? "-"}</dd>
              </div>
            </dl>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel-subtle p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Tramer Bilgisi</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{application.tramer_info ?? "-"}</p>
              </div>
              <div className="panel-subtle p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Hasar Bilgisi</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{application.damage_info ?? "-"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--text-muted)]">Araç Fotoğrafları</p>
              {photoUrls.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {photoUrls.map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group block overflow-hidden rounded-2xl border border-[var(--border-color)]"
                    >
                      <img
                        src={url}
                        alt={`Araç fotoğrafı ${index + 1}`}
                        loading="lazy"
                        className="h-44 w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="panel-subtle p-3 text-sm text-[var(--text-secondary)]">Fotoğraf bulunmuyor.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card tone="elevated">
          <CardHeader>
            <CardTitle className="text-xl">Teklif Oluştur</CardTitle>
            <CardDescription>Müşteri için teklif tutarı ve açıklama ekleyin.</CardDescription>
          </CardHeader>
          <CardContent>
            <OfferForm applicationId={application.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
