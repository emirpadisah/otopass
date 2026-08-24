import { APPLICATIONS_BUCKET } from "@/lib/public-applications";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function runMaintenance() {
  const supabase = createSupabaseServiceClient();
  const now = new Date();
  const { data: retention, error: retentionError } = await supabase.from("app_settings").select("value").eq("key", "retention").maybeSingle();
  if (retentionError) throw retentionError;
  const settings = (retention?.value ?? {}) as { archive_after_days?: number; purge_after_days?: number };
  const archiveDays = Number.isInteger(settings.archive_after_days) && settings.archive_after_days! >= 30 && settings.archive_after_days! <= 3650
    ? settings.archive_after_days!
    : 365;
  const purgeDays = Number.isInteger(settings.purge_after_days) && settings.purge_after_days! >= 1 && settings.purge_after_days! <= 365
    ? settings.purge_after_days!
    : 30;

  const { error: rateLimitCleanupError } = await supabase.from("rate_limit_buckets").delete().lt("expires_at", now.toISOString());
  if (rateLimitCleanupError) throw rateLimitCleanupError;

  const { data: expiredSessions, error: sessionError } = await supabase.from("upload_sessions").select("id, application_id").eq("status", "pending").lt("expires_at", now.toISOString()).limit(100);
  if (sessionError) throw sessionError;
  let orphanedUploads = 0;
  for (const session of expiredSessions ?? []) {
    const { data: items, error: itemError } = await supabase.from("upload_items").select("object_path").eq("session_id", session.id);
    if (itemError) throw itemError;
    const paths = (items ?? []).map((item) => item.object_path);
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from(APPLICATIONS_BUCKET).remove(paths);
      if (removeError) throw removeError;
    }
    const { error: deleteError } = await supabase.from("applications").delete().eq("id", session.application_id).is("submitted_at", null);
    if (deleteError) throw deleteError;
    orphanedUploads += paths.length;
  }

  const archiveBefore = new Date(now.getTime() - archiveDays * 86_400_000).toISOString();
  const { data: archived, error: archiveError } = await supabase.from("applications").update({ status: "archived", archived_at: now.toISOString() }).neq("status", "archived").lt("updated_at", archiveBefore).select("id, dealer_id");
  if (archiveError) throw archiveError;
  for (const application of archived ?? []) {
    const { error: auditError } = await supabase.from("activity_log").insert({ dealer_id: application.dealer_id, application_id: application.id, action: "APPLICATION_ARCHIVED", metadata: { source: "retention" } });
    if (auditError) throw auditError;
  }

  const purgeBefore = new Date(now.getTime() - purgeDays * 86_400_000).toISOString();
  const { data: purgeCandidates, error: purgeCandidateError } = await supabase.from("applications").select("id, dealer_id, photo_paths").eq("status", "archived").is("purged_at", null).lt("archived_at", purgeBefore).limit(100);
  if (purgeCandidateError) throw purgeCandidateError;
  let purged = 0;
  for (const application of purgeCandidates ?? []) {
    if (application.photo_paths.length) {
      const { error: removeError } = await supabase.storage.from(APPLICATIONS_BUCKET).remove(application.photo_paths);
      if (removeError) throw removeError;
    }
    const { error: purgeError } = await supabase.from("applications").update({ owner_name: null, owner_phone: null, owner_email: null, tramer_info: null, damage_info: null, photo_paths: [], purged_at: now.toISOString() }).eq("id", application.id);
    if (purgeError) throw purgeError;
    const { error: auditError } = await supabase.from("activity_log").insert({ dealer_id: application.dealer_id, application_id: application.id, action: "APPLICATION_PURGED", metadata: { source: "retention" } });
    if (auditError) throw auditError;
    purged += 1;
  }
  return { expiredSessions: expiredSessions?.length ?? 0, orphanedUploads, archived: archived?.length ?? 0, purged };
}
