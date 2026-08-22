"use client";

import { useActionState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { deleteDealerAction, updateDealerAction } from "../actions";
import type { Database } from "@/lib/supabase/database.types";

type Dealer = Database["public"]["Tables"]["dealers"]["Row"];
const initial: ActionResponse = { ok: false };

export function DealerManageForm({ dealer, canDelete }: { dealer: Dealer; canDelete: boolean }) {
  const [state, action, pending] = useActionState(updateDealerAction, initial);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteDealerAction, initial);
  return <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
    <form action={action} className="panel grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
      <input type="hidden" name="dealerId" value={dealer.id} />
      <Field label="Görünen ad" labelFor="name"><Input id="name" name="name" defaultValue={dealer.name} required /></Field>
      <Field label="Hukuki unvan" labelFor="legalName"><Input id="legalName" name="legalName" defaultValue={dealer.legal_name ?? ""} /></Field>
      <Field label="İletişim e-postası" labelFor="contactEmail"><Input id="contactEmail" name="contactEmail" type="email" defaultValue={dealer.contact_email ?? ""} /></Field>
      <Field label="KVKK e-postası" labelFor="privacyEmail"><Input id="privacyEmail" name="privacyEmail" type="email" defaultValue={dealer.privacy_contact_email ?? ""} /></Field>
      <Field label="Marka rengi" labelFor="brandColor"><Input id="brandColor" name="brandColor" defaultValue={dealer.brand_color ?? ""} placeholder="#E62D35" /></Field>
      <label className="checkbox-row sm:col-span-2"><input type="checkbox" name="isActive" defaultChecked={dealer.is_active} /><span>Galeri aktif ve başvuru kabul ediyor</span></label>
      {state.message ? <div className="status-alert sm:col-span-2" data-tone={state.ok ? "success" : "danger"}>{state.message}</div> : null}
      <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit"><Save size={15} /> Kaydet</Button>
    </form>
    {canDelete ? <form action={deleteAction} className="panel h-fit space-y-4 border-[var(--danger)] p-5" onSubmit={(event) => { if (!window.confirm("Galeri ve ilişkili tüm veriler kalıcı olarak silinecek. Devam edilsin mi?")) event.preventDefault(); }}><input type="hidden" name="dealerId" value={dealer.id} /><h2 className="font-bold text-[var(--danger)]">Kalıcı silme</h2><p className="text-sm text-[var(--text-muted)]">Başvurular, teklifler ve üyelikler geri alınamaz biçimde silinir.</p>{deleteState.message ? <div className="status-alert" data-tone={deleteState.ok ? "success" : "danger"}>{deleteState.message}</div> : null}<Button type="submit" variant="danger" disabled={deletePending}><Trash2 size={15} /> Galeriyi Sil</Button></form> : null}
  </div>;
}
