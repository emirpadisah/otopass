"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog } from "@/components/ui";
import { DEALER_LOGO_UPDATED_EVENT } from "@/lib/dealer-branding";

type DealerLogoManagerProps = {
  dealerName: string;
  initialLogoSrc: string | null;
  canManage: boolean;
  serviceAvailable: boolean;
};

export function DealerLogoManager({ dealerName, initialLogoSrc, canManage, serviceAvailable }: DealerLogoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoSrc, setLogoSrc] = useState(initialLogoSrc);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  async function uploadLogo(file: File) {
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      setMessage({ tone: "danger", text: "JPG, PNG veya WebP biçiminde en fazla 8 MB dosya seçin." });
      return;
    }

    setPending(true);
    setMessage(null);
    try {
      const imageCompression = (await import("browser-image-compression")).default;
      const compressed = await imageCompression(file, {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
        preserveExif: false,
        fileType: "image/webp",
      });
      const body = new FormData();
      body.set("file", compressed, "dealer-logo.webp");
      const response = await fetch("/api/dealer/logo", { method: "POST", body });
      const result = await response.json() as { error?: string; logoUrl?: string };
      if (!response.ok || !result.logoUrl) throw new Error(result.error || "Logo yüklenemedi.");
      setLogoSrc(result.logoUrl);
      window.dispatchEvent(new CustomEvent(DEALER_LOGO_UPDATED_EVENT, {
        detail: { logoSrc: result.logoUrl },
      }));
      setMessage({ tone: "success", text: "Galeri logosu güncellendi." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Logo yüklenemedi." });
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!logoSrc || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/dealer/logo", { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Logo kaldırılamadı.");
      setLogoSrc(null);
      window.dispatchEvent(new CustomEvent(DEALER_LOGO_UPDATED_EVENT, {
        detail: { logoSrc: null },
      }));
      setMessage({ tone: "success", text: "Galeri logosu kaldırıldı." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Logo kaldırılamadı." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="dealer-logo-manager">
      <div className="dealer-logo-preview" data-custom={Boolean(logoSrc)}>
        {logoSrc ? (
          <Image src={logoSrc} alt={`${dealerName} logosu`} fill sizes="(max-width: 640px) 80vw, 360px" loading="eager" fetchPriority="high" unoptimized />
        ) : (
          <div className="dealer-logo-placeholder" role="img" aria-label={`${dealerName} için logo yüklenmedi`}>
            <ImagePlus size={26} strokeWidth={1.6} aria-hidden="true" />
            <strong>{dealerName}</strong>
            <span>Logo yüklenmedi</span>
          </div>
        )}
      </div>
      <div className="dealer-logo-copy">
        <div>
          <span className="ops-eyebrow">Başvuru formunda görünen logo</span>
          <h3>{logoSrc ? "Logo yayında" : "Henüz logo yüklenmedi"}</h3>
          <p>En iyi görünüm için şeffaf arka planlı, yatay PNG veya WebP kullanın.</p>
        </div>
        {canManage && serviceAvailable ? (
          <div className="dealer-logo-actions">
            <input
              ref={inputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadLogo(file);
              }}
              aria-label="Logo dosyası seç"
            />
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" size={15} aria-hidden="true" /> : logoSrc ? <Upload size={15} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
              {logoSrc ? "Logoyu değiştir" : "Logo yükle"}
            </Button>
            {logoSrc ? (
              <ConfirmDialog
                trigger={<Button type="button" size="sm" variant="secondary" disabled={pending} aria-label="Logoyu kaldır"><Trash2 size={15} aria-hidden="true" /> Kaldır</Button>}
                title="Logo kaldırılsın mı?"
                description="Başvuru formu ve teklif görsellerinde logo yerine galeri adı gösterilecek."
                confirmLabel="Logoyu kaldır"
                tone="danger"
                disabled={pending}
                onConfirm={removeLogo}
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {!serviceAvailable ? <div className="status-alert" data-tone="danger" role="status">Logo yönetimi şu anda kullanılamıyor.</div> : null}
      {message ? <div className="status-alert dealer-logo-message" data-tone={message.tone} role="status">{message.text}</div> : null}
    </div>
  );
}
