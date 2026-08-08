import { Check, LockKeyhole, ServerCog, Settings } from "lucide-react";
import { PanelPageHeader, PanelSection } from "@/components/ui";
import { getDataMode } from "@/lib/data-mode";

const envKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPTIONAL_ENABLE_CAPTCHA=false",
];

export default function AdminSettingsPage() {
  const dataMode = getDataMode();
  const securityItems = [
    dataMode === "local"
      ? "Başvuru fotoğrafları korumalı yerel dosya alanında tutulur"
      : "Başvuru fotoğrafları private storage içinde tutulur",
    "Kullanıcı oluşturma yalnızca admin panelindedir",
    "İlk girişte şifre değiştirme zorunludur",
    "Sunucu tarafı doğrulama ve bekleme süresi kontrolü aktiftir",
  ];
  const keys = dataMode === "local" ? ["OTOPASS_DATA_MODE=local", ".local-data/otopass.json"] : envKeys;

  return (
    <div>
      <PanelPageHeader
        eyebrow="Yönetim / Sistem"
        title="Ayarlar ve güvenlik"
        description="Çalışma modu, güvenlik varsayılanları ve altyapı gereksinimlerini tek görünümden doğrulayın."
        icon={Settings}
        meta={<span className="ops-chip"><span className="ops-live-dot" aria-hidden="true" /> {dataMode === "local" ? "Yerel mod" : "Supabase"}</span>}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PanelSection title="Güvenlik varsayılanları" description="Sistem genelinde zorunlu kontroller" icon={LockKeyhole}>
          <ul className="ops-check-list">
            {securityItems.map((item) => (
              <li key={item}><span><Check size={13} aria-hidden="true" /></span><p>{item}</p></li>
            ))}
          </ul>
        </PanelSection>

        <PanelSection title="Çalışma ortamı" description={`Aktif veri modu: ${dataMode === "local" ? "Yerel test verisi" : "Supabase"}`} icon={ServerCog}>
          <ul className="ops-code-list">
            {keys.map((key, index) => (
              <li key={key}><span>{String(index + 1).padStart(2, "0")}</span><code>{key}</code></li>
            ))}
          </ul>
        </PanelSection>
      </div>
    </div>
  );
}
