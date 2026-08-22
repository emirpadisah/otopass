"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { Database } from "@/lib/supabase/database.types";
import type { ActionResponse } from "@/lib/types";
import { updateDealerProfileAction } from "./actions";

type Dealer = Database["public"]["Tables"]["dealers"]["Row"];

export function ProfileForm({ dealer, canManage }: { dealer: Dealer; canManage: boolean }) {
  const [state, action, pending] = useActionState(updateDealerProfileAction, { ok: false } as ActionResponse);
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    <Field label="Galeri adı" labelFor="name"><Input id="name" name="name" defaultValue={dealer.name} disabled={!canManage} required /></Field>
    <Field label="Hukuki unvan" labelFor="legalName"><Input id="legalName" name="legalName" defaultValue={dealer.legal_name ?? ""} disabled={!canManage} /></Field>
    <Field label="İletişim e-postası" labelFor="contactEmail"><Input id="contactEmail" name="contactEmail" type="email" defaultValue={dealer.contact_email ?? ""} disabled={!canManage} /></Field>
    <Field label="KVKK e-postası" labelFor="privacyEmail"><Input id="privacyEmail" name="privacyEmail" type="email" defaultValue={dealer.privacy_contact_email ?? ""} disabled={!canManage} /></Field>
    <Field label="Marka rengi" labelFor="brandColor"><Input id="brandColor" name="brandColor" defaultValue={dealer.brand_color ?? ""} disabled={!canManage} placeholder="#E62D35" /></Field>
    {state.message ? <div className="status-alert sm:col-span-2" data-tone={state.ok ? "success" : "danger"}>{state.message}</div> : null}
    {canManage ? <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit"><Save size={15} /> Profili Kaydet</Button> : null}
  </form>;
}
