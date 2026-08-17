"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { updateSettingsAction } from "./actions";

export function SettingsForm({ archiveDays, purgeDays, notificationsEnabled }: { archiveDays: number; purgeDays: number; notificationsEnabled: boolean }) {
  const [state, action, pending] = useActionState(updateSettingsAction, { ok: false } as ActionResponse);
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><Field label="Arşivleme süresi (gün)" labelFor="archiveDays"><Input id="archiveDays" name="archiveDays" type="number" min={30} max={3650} defaultValue={archiveDays} required /></Field><Field label="Arşiv sonrası silme (gün)" labelFor="purgeDays"><Input id="purgeDays" name="purgeDays" type="number" min={1} max={365} defaultValue={purgeDays} required /></Field><label className="checkbox-row sm:col-span-2"><input type="checkbox" name="notificationsEnabled" defaultChecked={notificationsEnabled} /><span>E-posta bildirimleri aktif</span></label>{state.message ? <div className="status-alert sm:col-span-2" data-tone={state.ok ? "success" : "danger"}>{state.message}</div> : null}<Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit"><Save size={15} /> Ayarları Kaydet</Button></form>;
}
