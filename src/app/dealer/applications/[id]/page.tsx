import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, CarFront, ClipboardCheck, HandCoins, Phone, ScanSearch, UserRound } from "lucide-react";
import {
  ApplicationPhotoGallery,
  PanelPageHeader,
  PanelSection,
  StatusBadge,
  WhatsAppPhoneLink,
  VehicleConditionMap,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { isLocalDataMode } from "@/lib/data-mode";
import { canManageDealerMembership } from "@/lib/auth/route";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { normalizeVehicleBodyCondition } from "@/lib/vehicle-condition";
import { getDealerApplicationForCurrentUser, getDealerForCurrentUser, listDealerOffersForCurrentUser } from "@/lib/supabase/queries";
import { OfferForm } from "./OfferForm";
import { OfferDecisionForm } from "./OfferDecisionForm";
import { SoldButtonForm } from "../SoldButtonForm";

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
  const [application, dealer, offers] = await Promise.all([
    getDealerApplicationForCurrentUser(id),
    getDealerForCurrentUser(),
    listDealerOffersForCurrentUser(),
  ]);
  if (!application || !dealer) return notFound();
  const canManage = canManageDealerMembership(dealer.role);
  const currentOffer = offers.find((offer) => offer.application_id === application.id) ?? null;
  const photoUrls = await getSignedPhotoUrls(application.id, application.photo_paths ?? []);

  const facts = [
    { label: "Araç sahibi", value: application.owner_name ?? "-", icon: UserRound },
    { label: "Telefon", value: <WhatsAppPhoneLink phone={application.owner_phone} />, icon: Phone },
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
              <ApplicationPhotoGallery
                photos={photoUrls}
                vehicleLabel={`${application.brand} ${application.model}`}
              />
            ) : (
              <div className="ops-empty-state"><Camera size={20} aria-hidden="true" /><p>Bu başvuruda fotoğraf bulunmuyor.</p></div>
            )}
          </PanelSection>

          <PanelSection
            title="Kaporta ekspertizi"
            description="Başvuru sahibinin parça bazında ilettiği kaporta durumu"
            icon={ScanSearch}
          >
            <VehicleConditionMap value={normalizeVehicleBodyCondition(application.body_condition)} readOnly />
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
              title={application.status === "pending" || application.status === "rejected" ? "Teklif oluştur" : "Teklif süreci"}
              description="Müşteri görüşmesini ve satış kararını kontrollü biçimde ilerletin"
              icon={HandCoins}
            >
              {application.status === "pending" || application.status === "rejected" ? (
                <OfferForm applicationId={application.id} />
              ) : application.status === "offered" && currentOffer ? (
                <div className="space-y-4">
                  <div className="panel-subtle p-4">
                    <p className="text-xs text-[var(--text-muted)]">Bekleyen teklif</p>
                    <p className="mt-1 text-xl font-bold">
                      {new Intl.NumberFormat("tr-TR", { style: "currency", currency: currentOffer.currency, maximumFractionDigits: 0 }).format(currentOffer.amount)}
                    </p>
                  </div>
                  <OfferDecisionForm applicationId={application.id} offerId={currentOffer.id} />
                </div>
              ) : application.status === "accepted" ? (
                <div className="space-y-4">
                  <div className="status-alert" data-tone="success">Müşteri teklifi kabul etti. Araç devri tamamlandığında satışı kapatın.</div>
                  <SoldButtonForm applicationId={application.id} />
                </div>
              ) : (
                <div className="status-alert" role="status">Bu başvuruda bekleyen bir işlem bulunmuyor.</div>
              )}
            </PanelSection>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
