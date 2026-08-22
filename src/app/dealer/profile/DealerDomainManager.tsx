"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Copy, ExternalLink, Globe2, LoaderCircle, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Button, ConfirmSubmitButton, Field, Input } from "@/components/ui";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { ActionResponse } from "@/lib/types";
import { addDealerDomainAction, refreshDealerDomainAction, removeDealerDomainAction } from "./domain-actions";

type DealerDomain = Database["public"]["Tables"]["dealer_domains"]["Row"];
type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string };

const initialState: ActionResponse = { ok: false };
const statusLabels = {
  pending: "Sahiplik bekleniyor",
  misconfigured: "DNS bekleniyor",
  verified: "Yayında",
  error: "Kontrol gerekli",
} satisfies Record<DealerDomain["status"], string>;

function parseRecords(value: Json): DnsRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const { type, name, value: recordValue } = item;
    if ((type !== "A" && type !== "CNAME" && type !== "TXT") || typeof name !== "string" || typeof recordValue !== "string") return [];
    return [{ type, name, value: recordValue }];
  });
}

function StateMessage({ state }: { state: ActionResponse }) {
  if (!state.message) return null;
  return <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role="status">{state.message}</div>;
}

function DnsRecordRow({ record }: { record: DnsRecord }) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    await navigator.clipboard.writeText(record.value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="dealer-domain-record">
      <span className="dealer-domain-record-type">{record.type}</span>
      <div><small>Ad / Host</small><code>{record.name}</code></div>
      <div><small>Değer / Target</small><code>{record.value}</code></div>
      <button type="button" onClick={copyValue} className="dealer-domain-copy" aria-label={`${record.value} değerini kopyala`} title="Değeri kopyala">
        {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      </button>
    </div>
  );
}

export function DealerDomainManager({
  domain,
  canManage,
  serviceConfigured,
}: {
  domain: DealerDomain | null;
  canManage: boolean;
  serviceConfigured: boolean;
}) {
  const router = useRouter();
  const [addState, addAction, adding] = useActionState(addDealerDomainAction, initialState);
  const [refreshState, refreshAction, refreshing] = useActionState(refreshDealerDomainAction, initialState);
  const [removeState, removeAction, removing] = useActionState(removeDealerDomainAction, initialState);
  const records = domain ? [...parseRecords(domain.verification), ...parseRecords(domain.dns_records)] : [];
  const busy = adding || refreshing || removing;
  const removeFormId = "remove-dealer-domain";

  useEffect(() => {
    if (addState.ok || refreshState.ok || removeState.ok) {
      const timer = window.setTimeout(() => router.refresh(), 300);
      return () => window.clearTimeout(timer);
    }
  }, [addState.ok, refreshState.ok, removeState.ok, router]);

  if (!serviceConfigured && !domain) {
    return (
      <div className="dealer-domain-unavailable" role="status">
        <AlertTriangle size={20} aria-hidden="true" />
        <div><strong>Alan adı servisi hazırlanıyor</strong><p>Vercel bağlantısı tamamlandığında bu ekrandan domain ekleyebileceksiniz.</p></div>
      </div>
    );
  }

  if (!domain) {
    return (
      <form action={addAction} className="dealer-domain-connect">
        <div className="dealer-domain-connect-icon"><Globe2 size={24} aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <Field label="Özel alan adı" labelFor="hostname" description="Domain sağlayıcınızda gösterilecek DNS kayıtlarını tanımlamanız gerekir.">
            <Input id="hostname" name="hostname" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="basvuru.galeriniz.com" disabled={!canManage || adding} required />
          </Field>
        </div>
        {canManage ? (
          <Button type="submit" disabled={adding} className="dealer-domain-connect-button">
            {adding ? <LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> : <Globe2 size={16} aria-hidden="true" />}
            {adding ? "Ekleniyor..." : "Domaini bağla"}
          </Button>
        ) : null}
        <div className="dealer-domain-state"><StateMessage state={addState} /></div>
      </form>
    );
  }

  return (
    <div className="dealer-domain-manager">
      <div className="dealer-domain-summary">
        <div className="dealer-domain-status-icon" data-status={domain.status}>
          {domain.status === "verified" ? <ShieldCheck size={21} aria-hidden="true" /> : <Globe2 size={21} aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <span className="ops-eyebrow">Bağlı alan adı</span>
          <h3>{domain.hostname}</h3>
          <p>{domain.status === "verified" ? "SSL aktif, müşteri formu bu alan adında yayında." : "DNS değişikliklerini tamamladıktan sonra bağlantıyı yeniden kontrol edin."}</p>
        </div>
        <span className="dealer-domain-badge" data-status={domain.status}>{statusLabels[domain.status]}</span>
        {domain.status === "verified" ? (
          <a href={`https://${domain.hostname}`} target="_blank" rel="noreferrer" className="dealer-domain-open" aria-label={`${domain.hostname} adresini aç`} title="Alan adını aç">
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {records.length > 0 && domain.status !== "verified" ? (
        <div className="dealer-domain-dns">
          <div><h4>DNS kayıtları</h4><p>Bu kayıtları domain sağlayıcınızın DNS paneline aynen ekleyin.</p></div>
          <div className="dealer-domain-records">
            {records.map((record, index) => <DnsRecordRow key={`${record.type}-${record.name}-${index}`} record={record} />)}
          </div>
        </div>
      ) : null}

      {domain.last_error && domain.status === "error" ? <div className="status-alert" data-tone="danger">{domain.last_error}</div> : null}
      <StateMessage state={refreshState.message ? refreshState : removeState} />

      {canManage && serviceConfigured ? (
        <div className="dealer-domain-actions">
          <form action={refreshAction}>
            <Button type="submit" size="sm" variant="secondary" disabled={busy}>
              {refreshing ? <LoaderCircle className="animate-spin" size={15} aria-hidden="true" /> : <RefreshCw size={15} aria-hidden="true" />}
              Bağlantıyı kontrol et
            </Button>
          </form>
          <form id={removeFormId} action={removeAction}>
            <ConfirmSubmitButton
              formId={removeFormId}
              title="Özel alan adı bağlantısını kaldır?"
              description={`${domain.hostname} adresi artık müşteri formuna yönlenmeyecek.`}
              confirmLabel="Bağlantıyı kaldır"
              details={["Vercel alan adı kaydı kaldırılır", "Standart form adresi çalışmaya devam eder"]}
              tone="danger"
              size="sm"
              variant="ghost"
              disabled={busy}
              className="text-[var(--danger)]"
            >
              <Trash2 size={15} aria-hidden="true" /> Kaldır
            </ConfirmSubmitButton>
          </form>
        </div>
      ) : null}
      {!serviceConfigured ? <div className="status-alert" data-tone="danger">Alan adı doğrulama servisi şu anda kullanılamıyor.</div> : null}
    </div>
  );
}
