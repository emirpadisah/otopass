"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { Button } from "./button";
import { Field, Input, Textarea } from "./input";
import { tomorrowReminderValue } from "@/lib/application-followup";
import { addFollowupAction, completeFollowupAction } from "@/app/dealer/applications/[id]/followup-actions";
import type { ActionResponse } from "@/lib/types";

const initialState: ActionResponse = { ok: false };

export function FollowupForm({ applicationId, closed }: { applicationId: string; closed: boolean }) {
  const [reminderAt, setReminderAt] = useState("");
  const [note, setNote] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (previous: ActionResponse, formData: FormData) => {
    const result = await addFollowupAction(previous, formData);
    if (result.ok) { setNote(""); setReminderAt(""); }
    return result;
  }, initialState);
  return <form ref={formRef} action={action} className="space-y-4">
    <input type="hidden" name="applicationId" value={applicationId} />
    <fieldset disabled={pending} className="space-y-4">
      <Field label="Galeri içi not" labelFor="followup-note" description="Yalnızca galeri ekibiniz görür.">
        <Textarea id="followup-note" name="note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} required placeholder="Örn. Müşteriyle görüşüldü, yarın tekrar aranacak." />
      </Field>
      {!closed ? <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setReminderAt(tomorrowReminderValue())}>
            <Bell size={14} aria-hidden="true" /> Yarın hatırlat
          </Button>
          {!reminderAt ? <Button type="button" variant="ghost" size="sm" onClick={() => setReminderAt(tomorrowReminderValue())}>Tarih seç</Button> :
            <Button type="button" variant="ghost" size="sm" onClick={() => setReminderAt("")}>Hatırlatmayı kaldır</Button>}
        </div>
        {reminderAt ? <Field label="Hatırlatma zamanı" labelFor="followup-reminder" description="Türkiye saati · zamanı geldiğinde galeri ana ekranında görünür.">
          <Input id="followup-reminder" name="reminderAt" type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} required />
        </Field> : null}
      </div> : null}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Kaydediliyor…" : "Notu kaydet"}</Button>
    </fieldset>
    {state.message ? <div className="status-alert" data-tone={state.ok ? "success" : "danger"} role={state.ok ? "status" : "alert"}>
      {state.message}
      {state.ok ? <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={() => { setNote(""); setReminderAt(""); formRef.current?.querySelector("textarea")?.focus(); }}>Yeni not</Button> : null}
    </div> : null}
  </form>;
}

export function CompleteFollowupButton({ followupId }: { followupId: string }) {
  const [state, action, pending] = useActionState(completeFollowupAction, initialState);
  return <form action={action} className="space-y-2">
    <input type="hidden" name="followupId" value={followupId} />
    <Button type="submit" size="sm" variant="secondary" disabled={pending || state.ok}>
      <Check size={14} aria-hidden="true" /> {pending ? "Kaydediliyor…" : state.ok ? "Tamamlandı" : "Tamamlandı işaretle"}
    </Button>
    {!state.ok && state.message ? <p role="alert" className="text-sm text-[var(--danger)]">{state.message}</p> : null}
  </form>;
}

// Keep a dashboard left open up to date without browser notifications.
export function FollowupRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return null;
}
