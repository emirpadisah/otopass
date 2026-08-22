import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ClipboardList, HandCoins, ScanSearch, ShieldCheck } from "lucide-react";
import {
  ApplicationPhotoGallery,
  ApplicationDeleteButton,
  PanelPageHeader,
  PanelSection,
  StatusBadge,
  WhatsAppPhoneLink,
  VehicleConditionMap,
  buttonVariants,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { getApplicationPhotoUrls } from "@/lib/application-photo-urls";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { normalizeVehicleBodyCondition } from "@/lib/vehicle-condition";
import { deleteAdminApplicationAction } from "./actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatNumber(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("tr-TR").format(value);
}

export default async function AdminApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServiceClient();
  const [{ data: application }, { data: offers }] = await Promise.all([
    supabase.from("applications").select("*").eq("id", id).maybeSingle(),
    supabase.from("offers").select("*").eq("application_id", id).order("created_at", { ascending: false }),
  ]);

  if (!application) notFound();

  const [{ data: dealer }, photoUrls] = await Promise.all([
    supabase.from("dealers").select("name").eq("id", application.dealer_id).maybeSingle(),
    getApplicationPhotoUrls(application.id, application.photo_paths ?? []),
  ]);
  const vehicleLabel = `${application.brand} ${application.model}`;

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Başvuru"
        title={vehicleLabel}
        description={`${dealer?.name || "Galeri"} · ${application.reference_code}`}
        icon={ClipboardList}
        meta={
          <>
            <StatusBadge status={application.status} />
            <span className="ops-chip">
              <Camera size={13} aria-hidden="true" />
              {photoUrls.viewUrls.length} fotoğraf
            </span>
          </>
        }
        actions={
          <>
            <ApplicationDeleteButton
              action={deleteAdminApplicationAction}
              applicationId={application.id}
              referenceCode={application.reference_code}
              vehicleLabel={vehicleLabel}
            />
            <Link
              href="/admin/applications"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "inline-flex")}
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Listeye dön
            </Link>
          </>
        }
      />

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_380px]">
        <div className="grid min-w-0 content-start gap-4">
          <PanelSection
            title="Araç fotoğrafları"
            description="Başvuru sırasında yüklenen inceleme görselleri"
            icon={Camera}
            meta={<span className="ops-chip">{photoUrls.viewUrls.length} dosya</span>}
          >
            {photoUrls.viewUrls.length > 0 ? (
              <ApplicationPhotoGallery
                photos={photoUrls.viewUrls}
                downloadUrls={photoUrls.downloadUrls}
                vehicleLabel={vehicleLabel}
              />
            ) : (
              <div className="ops-empty-state">
                <Camera size={20} aria-hidden="true" />
                <p>Bu başvuruda fotoğraf bulunmuyor.</p>
              </div>
            )}
          </PanelSection>

          <PanelSection
            title="Kaporta ekspertizi"
            description="Başvuru sahibinin parça bazında ilettiği kaporta durumu"
            icon={ScanSearch}
          >
            <VehicleConditionMap value={normalizeVehicleBodyCondition(application.body_condition)} readOnly />
          </PanelSection>

          <PanelSection
            title="Ekspertiz notları"
            description="Müşterinin ilettiği tramer ve hasar beyanı"
            icon={ShieldCheck}
          >
            <dl className="ops-note-list">
              <div>
                <dt>Tramer bilgisi</dt>
                <dd>{application.tramer_info ?? "-"}</dd>
              </div>
              <div>
                <dt>Hasar bilgisi</dt>
                <dd>{application.damage_info ?? "-"}</dd>
              </div>
            </dl>
          </PanelSection>
        </div>

        <aside className="grid min-w-0 content-start gap-4">
          <PanelSection
            title="Başvuru bilgileri"
            description="Müşteri, araç ve onay kayıtları"
            icon={ClipboardList}
          >
            <dl className="ops-info-list">
              <div className="ops-info-row"><dt>Müşteri</dt><dd>{application.owner_name ?? "-"}</dd></div>
              <div className="ops-info-row"><dt>Telefon</dt><dd><WhatsAppPhoneLink phone={application.owner_phone} /></dd></div>
              <div className="ops-info-row"><dt>Paket</dt><dd>{application.vehicle_package ?? "-"}</dd></div>
              <div className="ops-info-row"><dt>Model yılı</dt><dd>{application.model_year ?? "-"}</dd></div>
              <div className="ops-info-row"><dt>Kilometre</dt><dd>{formatNumber(application.km)} km</dd></div>
              <div className="ops-info-row"><dt>Yakıt</dt><dd>{application.fuel_type ?? "-"}</dd></div>
              <div className="ops-info-row"><dt>Vites</dt><dd>{application.transmission ?? "-"}</dd></div>
              <div className="ops-info-row"><dt>KVKK sürümü</dt><dd>{application.privacy_version ?? "-"}</dd></div>
            </dl>
          </PanelSection>

          <PanelSection
            title="Teklif geçmişi"
            description="Bu başvuru için oluşturulan teklifler"
            icon={HandCoins}
            meta={offers?.length ? <span className="ops-chip">{offers.length} kayıt</span> : undefined}
          >
            {offers?.length ? (
              <div className="space-y-3">
                {offers.map((offer) => (
                  <div key={offer.id} className="panel-subtle p-4">
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                      <strong className="min-w-0 break-words">
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: offer.currency,
                          maximumFractionDigits: 0,
                        }).format(offer.amount)}
                      </strong>
                      <StatusBadge status={offer.status} />
                    </div>
                    <p className="mt-2 break-words text-xs text-[var(--text-muted)]">
                      {offer.notes || "Not yok"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Teklif bulunmuyor.</p>
            )}
          </PanelSection>
        </aside>
      </div>
    </div>
  );
}
