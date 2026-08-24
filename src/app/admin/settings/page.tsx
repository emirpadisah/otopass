import { Check, LockKeyhole, ServerCog, Settings } from "lucide-react";
import { PanelPageHeader, PanelSection } from "@/components/ui";
import { requireAdminAccess } from "@/lib/auth/roles";
import { getDataMode } from "@/lib/data-mode";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  await requireAdminAccess();
  const dataMode = getDataMode();
  let archiveDays = 365;
  let purgeDays = 30;
  if (dataMode === "supabase") {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase.from("app_settings").select("key, value").eq("key", "retention");
    for (const setting of data ?? []) {
      const value = setting.value as Record<string, number | boolean>;
      if (setting.key === "retention") { archiveDays = Number(value.archive_after_days ?? 365); purgeDays = Number(value.purge_after_days ?? 30); }
    }
  }
  const securityItems = ["Fotoğraflar özel depolama alanında tutulur", "Rol ve hesap durumu her istekte doğrulanır", "Kötüye kullanım ve otomatik gönderim koruması uygulanır", "Kayıtlar belirlenen süre sonunda arşivlenir ve anonimleştirilir"];
  return <div><PanelPageHeader eyebrow="Yönetim / Sistem" title="Veri saklama ve güvenlik" description="Başvuruların saklama sürelerini ve etkin güvenlik kontrollerini yönetin." icon={Settings} meta={<span className="ops-chip"><span className="ops-live-dot" /> {dataMode === "local" ? "Yerel test ortamı" : "Canlı veri"}</span>} />
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><PanelSection title="Veri saklama süreleri" description="Arşivleme ve anonimleştirme zamanlarını belirleyin" icon={Settings}><SettingsForm archiveDays={archiveDays} purgeDays={purgeDays} /></PanelSection><PanelSection title="Etkin güvenlik kontrolleri" icon={LockKeyhole}><ul className="ops-check-list">{securityItems.map((item) => <li key={item}><span><Check size={13} /></span><p>{item}</p></li>)}</ul></PanelSection><PanelSection title="Altyapı servisleri" description="Uygulamanın kullandığı yönetilen servisler" icon={ServerCog}><ul className="ops-code-list">{["Supabase", "Cloudflare Turnstile", "Sentry", "Vercel Cron"].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><code>{item}</code></li>)}</ul></PanelSection></div>
  </div>;
}
