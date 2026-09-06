import "server-only";

import { randomUUID } from "node:crypto";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { canManageDealerMembership } from "@/lib/auth/route";
import { isLocalDataMode } from "@/lib/data-mode";
import { mutateLocalData, readLocalData } from "@/lib/local/store";
import { validateFollowup } from "@/lib/application-followup";
import { createSupabaseServerClient } from "./server";
import type { Database } from "./database.types";

export type ApplicationFollowup = Database["public"]["Tables"]["application_followups"]["Row"];
export type DueFollowup = ApplicationFollowup & { brand: string; model: string; owner_name: string | null };

async function requireFollowupAccess(manage = false) {
  const context = await getRequestAccessContext();
  if (!context?.isActive || !context.dealerId || context.mustChangePassword) throw new Error("Galeri oturumu gerekli.");
  if (manage && !canManageDealerMembership(context.membershipRole ?? "")) throw new Error("Bu işlem için galeri yönetim yetkisi gerekli.");
  return context;
}

function mapError(message: string, fallback: string) {
  if (message.includes("FORBIDDEN")) return new Error("Bu başvuru için yetkiniz bulunmuyor.");
  if (message.includes("INVALID_REMINDER")) return new Error("Hatırlatma için gelecekte bir tarih seçin.");
  if (message.includes("APPLICATION_CLOSED")) return new Error("Tamamlanan veya arşivlenen başvurulara hatırlatma eklenemez.");
  return new Error(fallback);
}

export async function listApplicationFollowups(applicationId: string): Promise<ApplicationFollowup[]> {
  const context = await requireFollowupAccess();
  if (isLocalDataMode()) {
    const data = await readLocalData();
    if (!data.applications.some((a) => a.id === applicationId && a.dealer_id === context.dealerId && a.submitted_at && !a.purged_at)) return [];
    return data.application_followups.filter((n) => n.application_id === applicationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 50);
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("application_followups").select("*")
    .eq("application_id", applicationId).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
  if (error) throw new Error("Görüşme notları yüklenemedi.");
  return data ?? [];
}

export async function getDueFollowups(): Promise<{ items: DueFollowup[]; total: number }> {
  const context = await requireFollowupAccess();
  if (isLocalDataMode()) {
    const data = await readLocalData();
    const applications = new Map(data.applications.filter((a) => a.dealer_id === context.dealerId && a.submitted_at && !a.purged_at && !["sold", "archived"].includes(a.status)).map((a) => [a.id, a]));
    const due = data.application_followups.filter((f) => applications.has(f.application_id) && f.reminder_at && !f.completed_at && Date.parse(f.reminder_at) <= Date.now())
      .sort((a, b) => a.reminder_at!.localeCompare(b.reminder_at!));
    return { total: due.length, items: due.slice(0, 20).map((f) => {
      const a = applications.get(f.application_id)!;
      return { ...f, brand: a.brand, model: a.model, owner_name: a.owner_name };
    }) };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_dealer_due_followups", { p_dealer_id: context.dealerId! });
  if (error) throw new Error("Hatırlatmalar yüklenemedi.");
  return data as unknown as { items: DueFollowup[]; total: number };
}

export async function addApplicationFollowup(input: unknown) {
  const context = await requireFollowupAccess(true);
  const { applicationId, note, reminderAt } = validateFollowup(input);
  if (isLocalDataMode()) {
    await mutateLocalData((data) => {
      const application = data.applications.find((a) => a.id === applicationId && a.dealer_id === context.dealerId && a.submitted_at && !a.purged_at);
      if (!application) throw mapError("FORBIDDEN", "");
      if (reminderAt && ["sold", "archived"].includes(application.status)) throw mapError("APPLICATION_CLOSED", "");
      data.application_followups.push({ id: randomUUID(), application_id: applicationId, note, reminder_at: reminderAt,
        completed_at: null, created_by: context.user.id, created_at: new Date().toISOString() });
      application.updated_at = new Date().toISOString();
    });
    return;
  }
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("add_application_followup", { p_application_id: applicationId, p_note: note, p_reminder_at: reminderAt });
  if (error) throw mapError(error.message, "Not kaydedilemedi. Lütfen yeniden deneyin.");
}

export async function completeApplicationFollowup(followupId: string): Promise<string> {
  const context = await requireFollowupAccess(true);
  if (isLocalDataMode()) {
    return mutateLocalData((data) => {
      const followup = data.application_followups.find((f) => f.id === followupId);
      const application = data.applications.find((a) => a.id === followup?.application_id && a.dealer_id === context.dealerId && a.submitted_at && !a.purged_at);
      if (!followup || !application) throw mapError("FORBIDDEN", "");
      if (!followup.reminder_at) throw new Error("Bu notta hatırlatma bulunmuyor.");
      if (!followup.completed_at) {
        followup.completed_at = new Date().toISOString();
        application.updated_at = followup.completed_at;
      }
      return followup.application_id;
    });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("complete_application_followup", { p_followup_id: followupId });
  if (error) throw mapError(error.message, "Hatırlatma tamamlanamadı. Lütfen yeniden deneyin.");
  return data;
}
