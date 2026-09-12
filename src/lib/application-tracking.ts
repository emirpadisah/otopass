import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { isLocalDataMode } from "./data-mode";
import { mutateLocalData, readLocalData } from "./local/store";
import { createSupabaseServiceClient } from "./supabase/service";
import { getDealerApplicationForCurrentUser, getDealerForCurrentUser } from "./supabase/queries";
import { canManageDealerMembership } from "./auth/route";
import { getPublicSiteOrigin } from "./site-url";

export const hashTrackingToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function createTrackingCredential() {
  const token = randomBytes(32).toString("hex");
  return { hash: hashTrackingToken(token), url: `${getPublicSiteOrigin()}/takip/${token}` };
}

export async function startApplicationReview(applicationId: string) {
  const [dealer, application] = await Promise.all([
    getDealerForCurrentUser(), getDealerApplicationForCurrentUser(applicationId),
  ]);
  if (!dealer || !canManageDealerMembership(dealer.role) || !application || application.dealer_id !== dealer.dealer_id || application.purged_at || !application.submitted_at) {
    throw new Error("Bu başvuru için işlem yetkiniz bulunmuyor.");
  }
  if (application.status !== "pending") throw new Error("Yalnızca bekleyen başvurularda inceleme başlatılabilir.");
  const patch = { review_started_at: new Date().toISOString() };
  if (isLocalDataMode()) {
    await mutateLocalData(data => {
      const row = data.applications.find(a => a.id === applicationId && a.dealer_id === dealer.dealer_id && !a.purged_at && a.submitted_at);
      if (!row || row.status !== "pending") throw new Error("Başvuru artık bu işleme uygun değil.");
      if (row.review_started_at) return;
      Object.assign(row, patch);
    });
  } else {
    const query = createSupabaseServiceClient().from("applications").update(patch)
      .eq("id", applicationId).eq("dealer_id", dealer.dealer_id).is("purged_at", null).not("submitted_at", "is", null)
      .eq("status", "pending").is("review_started_at", null);
    const { data, error } = await query.select("id");
    if (error) throw new Error("İşlem kaydedilemedi. Lütfen tekrar deneyin.");
    if (!data?.length && !application.review_started_at) throw new Error("Başvuru artık bu işleme uygun değil.");
  }
}

export async function readApplicationTracking(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const hash = hashTrackingToken(token);
  const local = isLocalDataMode() ? await readLocalData() : null;
  const db = local ? null : createSupabaseServiceClient();
  const result = local ? null : await db!.from("applications")
    .select("dealer_id,reference_code,brand,model,model_year,status,submitted_at,review_started_at,purged_at")
    .eq("tracking_token_hash", hash).maybeSingle();
  if (result?.error) throw new Error("Başvuru durumu şu anda alınamıyor.");
  const app = local ? local.applications.find(a => a.tracking_token_hash === hash) : result?.data;
  if (!app || app.purged_at || !app.submitted_at) return null;
  const dealerResult = local ? null : await db!.from("dealers").select("name,slug,is_active,contact_phone").eq("id", app.dealer_id).maybeSingle();
  if (dealerResult?.error) throw new Error("Galeri bilgileri şu anda alınamıyor.");
  const dealer = local ? local.dealers.find(d => d.id === app.dealer_id) : dealerResult?.data;
  if (!dealer?.is_active) return null;
  return {
    dealerName: dealer.name, dealerSlug: dealer.slug, contactPhone: dealer.contact_phone,
    reference: app.reference_code, vehicle: [app.brand, app.model, app.model_year].filter(Boolean).join(" · "),
    status: app.status, submittedAt: app.submitted_at, reviewStartedAt: app.review_started_at ?? null,
  };
}
