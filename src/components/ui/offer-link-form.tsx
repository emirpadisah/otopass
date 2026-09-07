"use client";
import { useActionState, useState } from "react";
import { shareOfferAction } from "@/app/teklif/actions";
export function OfferLinkForm({applicationId}:{applicationId:string}) {
 const [state, action, pending] = useActionState(shareOfferAction, {});
 const [copied,setCopied] = useState(false);
 return <form action={action} className="space-y-3">
  <input type="hidden" name="applicationId" value={applicationId}/>
  <label className="block text-sm">Müşteriye açıklama<textarea name="message" maxLength={2000} rows={3} className="mt-2 w-full rounded-lg border p-3" placeholder="Örneğin: Teklifimiz fiziki ekspertiz sonrasında netleşecektir." /></label>
  <p className="text-xs text-[var(--text-muted)]">Bağlantı 7 gün geçerlidir. Yeni bağlantı oluşturmak önceki bağlantıyı kapatır. İç görüşme notları paylaşılmaz.</p>
  <button disabled={pending} className="rounded-lg border px-4 py-2">{pending ? "Hazırlanıyor…" : "Teklif bağlantısı oluştur"}</button>
  {state.message ? <p role="alert">{state.message}</p> : null}
  {state.url ? <div className="space-y-2"><input aria-label="Müşteriye özel teklif bağlantısı" readOnly value={state.url} className="w-full rounded-lg border p-2"/><button type="button" className="rounded-lg border px-4 py-2" onClick={async()=>{try{await navigator.clipboard.writeText(state.url!);setCopied(true);}catch{setCopied(false);}}}>{copied ? "Kopyalandı" : "Bağlantıyı kopyala"}</button><a className="ml-3 underline" href={state.url} target="_blank" rel="noreferrer">Önizle</a></div> : null}
 </form>;
}
