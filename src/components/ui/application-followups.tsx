import Link from "next/link";
import { Bell, NotebookPen } from "lucide-react";
import { PanelSection } from "./panel";
import { CompleteFollowupButton, FollowupForm, FollowupRefresh } from "./followup-controls";
import { formatFollowupDate } from "@/lib/application-followup";
import { getDueFollowups, listApplicationFollowups } from "@/lib/supabase/followups";
import { buildApplicationHistory, type HistoryOffer } from "@/lib/application-history";

export async function ApplicationFollowups({ applicationId, canManage, closed, offers = [] }: { applicationId: string; canManage: boolean; closed: boolean; offers?: HistoryOffer[] }) {
  const followups = await listApplicationFollowups(applicationId);
  const history = buildApplicationHistory(offers, followups);
  // Authenticated async Server Component, evaluated once for this request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <PanelSection title="Görüşme notları ve hatırlatmalar" description="Başvurunun teklifleri, müşteri yanıtları ve galeri içi notları" icon={NotebookPen}>
    {canManage ? <FollowupForm applicationId={applicationId} closed={closed} /> : null}
    {history.length ? <details className="mt-5 rounded-lg border border-[var(--border-soft)] p-4">
      <summary className="cursor-pointer text-sm font-semibold">Teklif ve görüşme geçmişi ({history.length})</summary>
      <p className="mt-2 text-xs text-[var(--text-muted)]">En yeni işlem üstte · tüm teklifler ve son 50 galeri içi not</p>
      <ol className="mt-4 grid gap-3" aria-label="Teklif ve görüşme geçmişi">
      {history.map((entry) => <li key={entry.id} className="panel-subtle space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-sm">{entry.title}</strong>
          <time className="text-xs text-[var(--text-muted)]" dateTime={entry.date}>{formatFollowupDate(entry.date)}</time>
        </div>
        {entry.offer ? <p className="text-base font-bold">{new Intl.NumberFormat("tr-TR", { style: "currency", currency: entry.offer.currency, maximumFractionDigits: 0 }).format(entry.offer.amount)}</p> : null}
        {entry.note ? <div>{entry.noteLabel ? <p className="mb-1 text-xs text-[var(--text-muted)]">{entry.noteLabel}</p> : null}<p className="whitespace-pre-wrap break-words text-sm">{entry.note}</p></div> : null}
        {entry.followup?.reminder_at ? <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-secondary)]">
            {entry.followup.completed_at ? "Hatırlatma tamamlandı" : closed ? "Başvuru kapalı · hatırlatma gösterilmez" : Date.parse(entry.followup.reminder_at) <= now ? "Geri dönüş zamanı geldi" : "Hatırlatma"}
            {" · "}<time dateTime={entry.followup.reminder_at}>{formatFollowupDate(entry.followup.reminder_at)}</time>
          </span>
          {canManage && !entry.followup.completed_at ? <CompleteFollowupButton followupId={entry.followup.id} /> : null}
        </div> : null}
      </li>)}
      </ol>
    </details> : <p className="mt-4 text-sm text-[var(--text-muted)]">Henüz teklif veya görüşme notu bulunmuyor.</p>}
  </PanelSection>;
}

export async function DueFollowups({ canManage }: { canManage: boolean }) {
  const due = await getDueFollowups();
  return <>
    <FollowupRefresh />
    {due.total > 0 ? <PanelSection className="mt-4" title="Geri dönüş zamanı gelenler" description={due.total > due.items.length ? `${due.total} hatırlatmadan en eski 20 kayıt gösteriliyor. Tamamladıkça diğerleri görünür.` : "Zamanı gelen ve henüz tamamlanmayan hatırlatmalar"} icon={Bell} meta={<span className="ops-chip">{due.total} hatırlatma</span>}>
      <ol className="grid gap-3" aria-label="Zamanı gelen hatırlatmalar">
        {due.items.map((item) => <li key={item.id} className="panel-subtle flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1 basis-56 space-y-1">
            <Link href={`/dealer/applications/${item.application_id}`} prefetch={false} className="font-semibold underline underline-offset-4">{item.brand} {item.model}{item.owner_name ? ` · ${item.owner_name}` : ""}</Link>
            <p className="whitespace-pre-wrap break-words text-sm">{item.note}</p>
            <p className="text-xs text-[var(--text-muted)]"><time dateTime={item.reminder_at!}>{formatFollowupDate(item.reminder_at!)}</time></p>
          </div>
          {canManage ? <CompleteFollowupButton followupId={item.id} /> : null}
        </li>)}
      </ol>
    </PanelSection> : null}
  </>;
}
