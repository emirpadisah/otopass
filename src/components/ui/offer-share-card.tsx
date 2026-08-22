"use client";

import Image from "next/image";
import { Download, FileImage, LoaderCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VehicleConditionMap } from "@/components/ui/vehicle-condition-map";
import type { VehicleBodyCondition } from "@/lib/vehicle-condition";

type OfferVehicle = {
  brand: string;
  model: string;
  vehiclePackage: string | null;
  modelYear: number | null;
  km: number | null;
  fuelType: string | null;
  transmission: string | null;
  tramerInfo: string | null;
  damageInfo: string | null;
};

type OfferShareCardProps = {
  dealerName: string;
  dealerLogoUrl?: string | null;
  referenceCode: string | null;
  amount: number;
  currency: string;
  notes: string | null;
  createdAt: string;
  vehicle: OfferVehicle;
  bodyCondition: VehicleBodyCondition;
};

type OfferSheetProps = OfferShareCardProps & {
  exportMode?: boolean;
};

function displayValue(value: string | number | null) {
  return value === null || value === "" ? "-" : String(value);
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function OfferSheet({
  dealerName,
  dealerLogoUrl,
  referenceCode,
  amount,
  currency,
  notes,
  createdAt,
  vehicle,
  bodyCondition,
  exportMode = false,
}: OfferSheetProps) {
  const facts = [
    { label: "Model yılı", value: displayValue(vehicle.modelYear) },
    { label: "Marka", value: vehicle.brand },
    { label: "Model", value: vehicle.model },
    { label: "Paket", value: displayValue(vehicle.vehiclePackage) },
    {
      label: "Kilometre",
      value: vehicle.km === null ? "-" : `${new Intl.NumberFormat("tr-TR").format(vehicle.km)} km`,
    },
    { label: "Yakıt", value: displayValue(vehicle.fuelType) },
    { label: "Vites", value: displayValue(vehicle.transmission) },
    { label: "Tramer", value: displayValue(vehicle.tramerInfo) },
  ];

  return (
    <article className="offer-sheet" data-export={exportMode || undefined}>
      <header className="offer-sheet-header">
        <div className="offer-sheet-brand">
          <Image
            src={dealerLogoUrl || "/images/pol-car-logo-transparent.png"}
            alt={dealerLogoUrl ? `${dealerName} logosu` : "POL-CAR"}
            width={1548}
            height={654}
            sizes={exportMode ? "310px" : "(max-width: 640px) 170px, 250px"}
            unoptimized
            priority={exportMode}
          />
          <div>
            <strong>{dealerName}</strong>
            <span>tarafından hazırlanmıştır</span>
          </div>
        </div>
        <div className="offer-sheet-price">
          <span>Ön değerlendirme fiyat teklifi</span>
          <strong>{formatAmount(amount, currency)}</strong>
          <small>{formatDate(createdAt)}</small>
        </div>
      </header>

      <dl className="offer-sheet-facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>

      <section className="offer-sheet-inspection">
        <div className="offer-sheet-section-heading">
          <div>
            <span>Ekspertiz bilgisi</span>
            <h3>Araç kaporta durumu</h3>
          </div>
          <strong>{referenceCode ? `Ref: ${referenceCode}` : "POL-CAR"}</strong>
        </div>
        <div className="offer-sheet-inspection-grid">
          <VehicleConditionMap value={bodyCondition} readOnly compact />
          <div className="offer-sheet-notes">
            <div>
              <span>Hasar beyanı</span>
              <p>{displayValue(vehicle.damageInfo)}</p>
            </div>
            <div>
              <span>Teklif notu</span>
              <p>{notes || "Ek teklif notu bulunmuyor."}</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="offer-sheet-footer">
        <div><i aria-hidden="true" /> POL-CAR araç değerlendirme sistemi</div>
        <p>Bu teklif ön değerlendirme niteliğindedir. Nihai tutar fiziki ekspertiz sonrasında netleşir.</p>
      </footer>
    </article>
  );
}

function createDownloadName(referenceCode: string | null) {
  const safeReference = (referenceCode || "teklif")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `pol-car-${safeReference || "teklif"}.png`;
}

export function OfferShareCard(props: OfferShareCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function downloadOfferVisual() {
    const node = exportRef.current;
    if (!node || isDownloading) return;

    setIsDownloading(true);
    setError(null);
    try {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>((resolve) => {
                image.addEventListener("load", () => resolve(), { once: true });
                image.addEventListener("error", () => resolve(), { once: true });
              }),
        ),
      );

      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        backgroundColor: "#f7f8fa",
        cacheBust: true,
        pixelRatio: 2,
      });
      const anchor = document.createElement("a");
      anchor.href = dataUrl;
      anchor.download = createDownloadName(props.referenceCode);
      anchor.click();
    } catch {
      setError("Teklif görseli hazırlanamadı. Lütfen yeniden deneyin.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="offer-share-card">
      <div className="offer-share-toolbar">
        <div>
          <FileImage size={18} aria-hidden="true" />
          <span>Paylaşıma hazır PNG</span>
        </div>
        <Button type="button" size="sm" onClick={downloadOfferVisual} disabled={isDownloading}>
          {isDownloading ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          {isDownloading ? "Hazırlanıyor..." : "Görseli indir"}
        </Button>
      </div>

      <div className="offer-sheet-preview">
        <OfferSheet {...props} />
      </div>
      {error ? <div className="status-alert" data-tone="danger" role="alert">{error}</div> : null}

      <div className="offer-sheet-export-stage" aria-hidden="true">
        <div ref={exportRef} className="offer-sheet-export-target">
          <OfferSheet {...props} exportMode />
        </div>
      </div>
    </div>
  );
}
