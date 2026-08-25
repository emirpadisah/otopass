"use client";

import Image from "next/image";
import { Download, FileImage, LoaderCircle, Store } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { VehicleConditionMap } from "@/components/ui/vehicle-condition-map";
import { getCurrentMobilePlatform, type MobilePlatform } from "@/lib/client-file-delivery";
import type { VehicleBodyCondition } from "@/lib/vehicle-condition";

type OfferVehicle = {
  brand: string;
  model: string;
  vehiclePackage: string | null;
  engineInfo: string | null;
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
    { label: "Motor", value: displayValue(vehicle.engineInfo) },
  ];

  return (
    <article className="offer-sheet" data-export={exportMode || undefined}>
      <header className="offer-sheet-header">
        <div className="offer-sheet-brand">
          {dealerLogoUrl ? (
            <Image
              src={dealerLogoUrl}
              alt={`${dealerName} logosu`}
              width={1548}
              height={654}
              sizes={exportMode ? "310px" : "(max-width: 640px) 170px, 250px"}
              unoptimized
              priority={exportMode}
            />
          ) : (
            <span className="offer-sheet-brand-placeholder" role="img" aria-label={`${dealerName} logo alanı`}>
              <Store size={exportMode ? 38 : 25} strokeWidth={1.6} aria-hidden="true" />
            </span>
          )}
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
          <strong>{referenceCode ? `Ref: ${referenceCode}` : dealerName}</strong>
        </div>
        <div className="offer-sheet-inspection-grid">
          <VehicleConditionMap value={bodyCondition} readOnly compact captureMode={exportMode} />
          <div className="offer-sheet-notes">
            <div>
              <span>Tramer kaydı</span>
              <p>{displayValue(vehicle.tramerInfo)}</p>
            </div>
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
        <div><i aria-hidden="true" /> {dealerName} araç değerlendirme</div>
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
  return `teklif-${safeReference || "arac"}.png`;
}

type PreparedOfferVisual = {
  blob: Blob;
  file: File;
  fileName: string;
};

type ShareAttempt = "shared" | "cancelled" | "retry" | "unsupported" | "failed" | "opened";

const OFFER_EXPORT_WIDTH = 1200;
const OFFER_EXPORT_SCALE = 2;

function canShareFile(file: File) {
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") {
    return false;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function shareFile(file: File, dealerName: string): Promise<ShareAttempt> {
  if (!canShareFile(file)) return "unsupported";

  const shareResult = navigator.share({
    files: [file],
    title: `${dealerName} araç fiyat teklifi`,
    text: "Araç ön değerlendirme fiyat teklifi",
  }).then(
    () => ({ status: "shared" as const }),
    (error: unknown) => ({ status: "failed" as const, error }),
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ status: "opened" }>((resolve) => {
    timer = setTimeout(() => resolve({ status: "opened" }), 15_000);
  });
  const result = await Promise.race([shareResult, timeout]);
  if (timer) clearTimeout(timer);

  if (result.status === "shared") return "shared";
  if (result.status === "opened") return "opened";

  const errorName = result.error instanceof DOMException
    ? result.error.name
    : result.error && typeof result.error === "object" && "name" in result.error
      ? String(result.error.name)
      : "";

  if (errorName === "AbortError") return "cancelled";
  if (errorName === "NotAllowedError") return "retry";
  return "failed";
}

function downloadBlob(blob: Blob, fileName: string, platform: MobilePlatform) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";

  if (platform === "ios") {
    anchor.target = "_blank";
  }

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Safari may continue reading the object URL after the synthetic click.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export function OfferShareCard(props: OfferShareCardProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const preparedVisualRef = useRef<PreparedOfferVisual | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function deliverVisual(prepared: PreparedOfferVisual, platform: MobilePlatform, wasPrepared: boolean) {
    if (platform === "ios") {
      const shareAttempt = await shareFile(prepared.file, props.dealerName);

      if (shareAttempt === "shared" || shareAttempt === "opened") {
        setNotice("Kaydetme ekranı açıldı. Görseli Fotoğraflar'a veya Dosyalar'a kaydedebilirsiniz.");
        return;
      }

      if (shareAttempt === "cancelled") {
        setNotice(null);
        return;
      }

      if (shareAttempt === "retry" && !wasPrepared) {
        setNotice("Görsel hazır. Kaydetme ekranını açmak için düğmeye yeniden dokunun.");
        return;
      }
    }

    downloadBlob(prepared.blob, prepared.fileName, platform);
    setNotice(platform === "ios"
      ? "Görsel yeni sekmede açıldı. Paylaş menüsünden Fotoğraflar'a veya Dosyalar'a kaydedebilirsiniz."
      : "Teklif görseli PNG olarak indirildi.");
  }

  async function downloadOfferVisual() {
    const node = exportRef.current;
    if (!node || isDownloading) return;

    const platform = getCurrentMobilePlatform();
    const preparedVisual = preparedVisualRef.current;
    setIsDownloading(true);
    setError(null);
    setNotice(null);
    try {
      if (preparedVisual) {
        await deliverVisual(preparedVisual, platform, true);
        return;
      }

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

      const { toBlob } = await import("html-to-image");
      // The export surface is deliberately fixed to the desktop composition.
      // It must not inherit the narrow mobile preview geometry.
      const exportWidth = OFFER_EXPORT_WIDTH;
      const exportHeight = node.scrollHeight;
      const blob = await toBlob(node, {
        backgroundColor: "#f7f8fa",
        cacheBust: true,
        width: exportWidth,
        height: exportHeight,
        canvasWidth: exportWidth * OFFER_EXPORT_SCALE,
        canvasHeight: exportHeight * OFFER_EXPORT_SCALE,
        // The hidden export surface is intentionally desktop-sized on every device.
        // This keeps iOS and Android downloads identical to the desktop PNG.
        pixelRatio: 1,
        skipAutoScale: true,
        style: {
          width: `${exportWidth}px`,
          minWidth: `${exportWidth}px`,
          maxWidth: "none",
          transform: "none",
        },
      });
      if (!blob) throw new Error("PNG blob could not be created");

      const fileName = createDownloadName(props.referenceCode);
      const prepared = {
        blob,
        fileName,
        file: new File([blob], fileName, { type: "image/png", lastModified: Date.now() }),
      };
      preparedVisualRef.current = prepared;
      await deliverVisual(prepared, platform, false);
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
      {notice ? <div className="status-alert" data-tone="success" role="status">{notice}</div> : null}
      {error ? <div className="status-alert" data-tone="danger" role="alert">{error}</div> : null}

      <div className="offer-sheet-export-stage" aria-hidden="true">
        <div ref={exportRef} className="offer-sheet-export-target">
          <OfferSheet {...props} exportMode />
        </div>
      </div>
    </div>
  );
}
