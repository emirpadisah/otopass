"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import type { ActionResponse } from "@/lib/types";
import { updateSettingsAction } from "./actions";

export function SettingsForm({ archiveDays, purgeDays }: { archiveDays: number; purgeDays: number }) {
  const [state, action, pending] = useActionState(updateSettingsAction, { ok: false } as ActionResponse);
  return <form action={action} className="grid gap-4 sm:grid-cols-2"><Field label="Arşivleme süresi (gün)" labelFor="archiveDays" description="Başvurunun son işlemden sonra aktif tutulacağı süre."><Input id="archiveDays" name="archiveDays" type="number" min={30} max={3650} defaultValue={archiveDays} required /></Field><Field label="Anonimleştirme süresi (gün)" labelFor="purgeDays" description="Arşivlemeden sonra kişisel verilerin kaldırılacağı süre."><Input id="purgeDays" name="purgeDays" type="number" min={1} max={365} defaultValue={purgeDays} required /></Field>{state.message ? <div className="status-alert sm:col-span-2" data-tone={state.ok ? "success" : "danger"}>{state.message}</div> : null}<Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit"><Save size={15} /> Ayarları kaydet</Button></form>;
}
