import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, CarFront, ClipboardCheck, HandCoins, Phone, UserRound } from "lucide-react";
import {
  PanelPageHeader,
  PanelSection,
  StatusBadge,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { isLocalDataMode } from "@/lib/data-mode";
import { canManageDealerMembership } from "@/lib/auth/route";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDealerApplicationForCurrentUser, getDealerForCurrentUser } from "@/lib/supabase/queries";
import { OfferForm } from "./OfferForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatNumber(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("tr-TR").format(value);
}

async function getSignedPhotoUrls(applicationId: string, photoPaths: string[]): Promise<string[]> {
  if (photoPaths.length === 0) return [];
  if (isLocalDataMode()) {
    return photoPaths.map((_, index) => `/api/applications/${applicationId}/photos?index=${index}`);
  }

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
  const [application, dealer] = await Promise.all([
    getDealerApplicationForCurrentUser(id),
    getDealerForCurrentUser(),
  ]);
  if (!application || !dealer) return notFound();
  const canManage = canManageDealerMembership(dealer.role);
  const photoUrls = await getSignedPhotoUrls(application.id, application.photo_paths ?? []);

  const facts = [
    { label: "Araç sahibi", value: application.owner_name ?? "-", icon: UserRound },
    { label: "Telefon", value: application.owner_phone ?? "-", icon: Phone },
    { label: "Model yılı", value: application.model_year ?? "-", icon: CarFront },
    { label: "Kilometre", value: `${formatNumber(application.km)} km`, icon: CarFront },
    { label: "Paket", value: application.vehicle_package ?? "-", icon: CarFront },
    { label: "Yakıt", value: application.fuel_type ?? "-", icon: CarFront },
    { label: "Vites", value: application.transmission ?? "-", icon: CarFront },
  ];

  return (
    <div>
      <PanelPageHeader
        eyebrow="Galeri / Başvuru detayı"
        title={`${application.brand} ${application.model}`}
        description={canManage
          ? "Araç verilerini ve görselleri doğrulayın, ardından karar teklifini oluşturun."
          : "Araç verilerini, görselleri ve mevcut başvuru durumunu inceleyin."}
        icon={CarFront}
        meta={
          <>
            <StatusBadge status={application.status} />
            <span className="ops-chip"><Camera size={13} aria-hidden="true" /> {photoUrls.length} fotoğraf</span>
          </>
        }
        actions={
          <Link
            href="/dealer/applications"
            className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Listeye dön
          </Link>
        }
      />

      <div className={cn("mt-4 grid gap-4", canManage && "xl:grid-cols-[minmax(0,1.35fr)_360px]")}>
        <div className="grid min-w-0 gap-4">
          <PanelSection
            title="Araç görselleri"
            description="İnceleme için yüklenen güncel fotoğraflar"
            icon={Camera}
            meta={<span className="ops-chip">{photoUrls.length} dosya</span>}
          >
            {photoUrls.length > 0 ? (
              <div className="ops-photo-grid">
                {photoUrls.map((url, index) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="ops-photo"
                    aria-label={`${index + 1}. araç fotoğrafını yeni sekmede aç`}
                  >
                    <Image
                      src={url}
                      alt={`Araç fotoğrafı ${index + 1}`}
                      width={900}
                      height={600}
                      unoptimized
                      className="h-full w-full object-cover"
                      priority={index === 0}
                    />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="ops-empty-state"><Camera size={20} aria-hidden="true" /><p>Bu başvuruda fotoğraf bulunmuyor.</p></div>
            )}
          </PanelSection>

          <div className="grid gap-4 lg:grid-cols-[1fr_.75fr]">
            <PanelSection title="Araç ve müşteri" description="Başvuru sırasında iletilen bilgiler" icon={ClipboardCheck}>
              <dl className="ops-fact-grid">
                {facts.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="ops-fact">
                    <dt><Icon size={14} aria-hidden="true" /> {label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </PanelSection>

            <PanelSection title="Ekspertiz notları" description="Tramer ve hasar beyanı" icon={ClipboardCheck}>
              <dl className="ops-note-list">
                <div><dt>Tramer bilgisi</dt><dd>{application.tramer_info ?? "-"}</dd></div>
                <div><dt>Hasar bilgisi</dt><dd>{application.damage_info ?? "-"}</dd></div>
              </dl>
            </PanelSection>
          </div>
        </div>

        {canManage ? (
          <aside className="xl:sticky xl:top-[102px] xl:self-start">
            <PanelSection
              title="Teklif oluştur"
              description="Tutarı ve müşteriye iletilecek notu kaydedin"
              icon={HandCoins}
            >
              <OfferForm applicationId={application.id} />
            </PanelSection>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
