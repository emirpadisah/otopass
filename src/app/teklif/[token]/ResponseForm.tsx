"use client";
import { useActionState } from "react";
import { customerResponseAction } from "../actions";
export function ResponseForm({token}:{token:string}) {
 const [state,action,pending] = useActionState(customerResponseAction,{message:""});
 return <form action={action} className="space-y-4">
 <input type="hidden" name="token" value={token}/>
 <div className="flex flex-wrap gap-3"><button disabled={pending || !!state.message} name="response" value="interested" className="rounded-xl bg-red-600 px-5 py-3 text-white">İlgileniyorum</button><button disabled={pending || !!state.message} name="response" value="contact" className="rounded-xl border px-5 py-3">Görüşmek istiyorum</button></div>
 <p role="status">{pending ? "İletiliyor…" : state.message}</p>
 </form>;
}
