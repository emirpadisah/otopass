import { APPLICATIONS_BUCKET } from "@/lib/public-applications";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function runMaintenance() {
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const { data: retention } = await supabase.from("app_settings").select("value").eq("key", "retention").maybeSingle();
  const settings = (retention?.value ?? {}) as { archive_after_days?: number; purge_after_days?: number };
  const archiveDays = settings.archive_after_days ?? 365;
  const purgeDays = settings.purge_after_days ?? 30;

  await supabase.from("rate_limit_buckets").delete().lt("expires_at", now.toISOString());

  const { data: expiredSessions } = await supabase.from("upload_sessions").select("id, application_id").eq("status", "pending").lt("expires_at", now.toISOString()).limit(100);
  let orphanedUploads = 0;
  for (const session of expiredSessions ?? []) {
    const { data: items } = await supabase.from("upload_items").select("object_path").eq("session_id", session.id);
    const paths = (items ?? []).map((item) => item.object_path);
    if (paths.length) await supabase.storage.from(APPLICATIONS_BUCKET).remove(paths);
    await supabase.from("applications").delete().eq("id", session.application_id).is("submitted_at", null);
    orphanedUploads += paths.length;
  }

  const archiveBefore = new Date(now.getTime() - archiveDays * 86_400_000).toISOString();
  const { data: archived } = await supabase.from("applications").update({ status: "archived", archived_at: now.toISOString() }).neq("status", "archived").lt("updated_at", archiveBefore).select("id, dealer_id");
  for (const application of archived ?? []) {
    await supabase.from("activity_log").insert({ dealer_id: application.dealer_id, application_id: application.id, action: "APPLICATION_ARCHIVED", metadata: { source: "retention" } });
  }

  const purgeBefore = new Date(now.getTime() - purgeDays * 86_400_000).toISOString();
  const { data: purgeCandidates } = await supabase.from("applications").select("id, dealer_id, photo_paths").eq("status", "archived").is("purged_at", null).lt("archived_at", purgeBefore).limit(100);
  let purged = 0;
  for (const application of purgeCandidates ?? []) {
    if (application.photo_paths.length) await supabase.storage.from(APPLICATIONS_BUCKET).remove(application.photo_paths);
    await supabase.from("applications").update({ owner_name: null, owner_phone: null, owner_email: null, tramer_info: null, damage_info: null, photo_paths: [], purged_at: now.toISOString() }).eq("id", application.id);
    await supabase.from("activity_log").insert({ dealer_id: application.dealer_id, application_id: application.id, action: "APPLICATION_PURGED", metadata: { source: "retention" } });
    purged += 1;
  }
  return { expiredSessions: expiredSessions?.length ?? 0, orphanedUploads, archived: archived?.length ?? 0, purged };
}
