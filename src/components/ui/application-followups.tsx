import Link from "next/link";
import { Bell, NotebookPen } from "lucide-react";
import { PanelSection } from "./panel";
import { CompleteFollowupButton, FollowupForm, FollowupRefresh } from "./followup-controls";
import { formatFollowupDate } from "@/lib/application-followup";
import { getDueFollowups, listApplicationFollowups } from "@/lib/supabase/followups";

export async function ApplicationFollowups({ applicationId, canManage, closed }: { applicationId: string; canManage: boolean; closed: boolean }) {
  const followups = await listApplicationFollowups(applicationId);
  // Authenticated async Server Component, evaluated once for this request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  return <PanelSection title="Görüşme notları ve hatırlatmalar" description="Başvuruya ait galeri içi notlar · son 50 kayıt" icon={NotebookPen}>
    {canManage ? <FollowupForm applicationId={applicationId} closed={closed} /> : null}
    {followups.length ? <ol className="mt-5 grid gap-3" aria-label="Görüşme notları">
      {followups.map((note) => <li key={note.id} className="panel-subtle space-y-3 p-4">
        <p className="whitespace-pre-wrap break-words text-sm">{note.note}</p>
        <p className="text-xs text-[var(--text-muted)]"><time dateTime={note.created_at}>{formatFollowupDate(note.created_at)}</time></p>
        {note.reminder_at ? <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-secondary)]">
            {note.completed_at ? "Hatırlatma tamamlandı" : closed ? "Başvuru kapalı · hatırlatma gösterilmez" : Date.parse(note.reminder_at) <= now ? "Geri dönüş zamanı geldi" : "Hatırlatma"}
            {" · "}<time dateTime={note.reminder_at}>{formatFollowupDate(note.reminder_at)}</time>
          </span>
          {canManage && !note.completed_at ? <CompleteFollowupButton followupId={note.id} /> : null}
        </div> : null}
      </li>)}
    </ol> : <p className="mt-4 text-sm text-[var(--text-muted)]">Henüz görüşme notu eklenmedi.</p>}
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
