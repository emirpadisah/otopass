import { Check, LockKeyhole, ServerCog, Settings } from "lucide-react";
import { PanelPageHeader, PanelSection } from "@/components/ui";
import { getDataMode } from "@/lib/data-mode";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
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
  const securityItems = ["Private Supabase Storage ve imzalı upload", "Admin hesaplarında zorunlu TOTP MFA", "Atomik HMAC rate limit ve Turnstile", "365 + 30 günlük veri yaşam döngüsü"];
  return <div><PanelPageHeader eyebrow="Yönetim / Sistem" title="Ayarlar ve güvenlik" description="Veri yaşam döngüsünü yönetin ve production kontrollerini doğrulayın." icon={Settings} meta={<span className="ops-chip"><span className="ops-live-dot" /> {dataMode === "local" ? "Yerel mod" : "Supabase"}</span>} />
    <div className="mt-4 grid gap-4 lg:grid-cols-2"><PanelSection title="Operasyon ayarları" description="Veri saklama sürelerini yönetin" icon={Settings}><SettingsForm archiveDays={archiveDays} purgeDays={purgeDays} /></PanelSection><PanelSection title="Güvenlik varsayılanları" icon={LockKeyhole}><ul className="ops-check-list">{securityItems.map((item) => <li key={item}><span><Check size={13} /></span><p>{item}</p></li>)}</ul></PanelSection><PanelSection title="Production servisleri" description="Dağıtım öncesi ortamda tanımlanır" icon={ServerCog}><ul className="ops-code-list">{["Supabase", "Cloudflare Turnstile", "Sentry", "Vercel Cron"].map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span><code>{item}</code></li>)}</ul></PanelSection></div>
  </div>;
}
