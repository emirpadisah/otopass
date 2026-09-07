import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { isLocalDataMode } from "./data-mode";
import { readLocalData, mutateLocalData } from "./local/store";
import { createSupabaseServiceClient } from "./supabase/service";
import { getDealerApplicationForCurrentUser, getDealerForCurrentUser, listDealerOffersForApplicationCurrentUser } from "./supabase/queries";
import { canManageDealerMembership } from "./auth/route";
import { normalizeMatch, normalizePhone, validOfferToken, type OfferLink } from "./offer-link-types";
import { getPublicSiteOrigin } from "./site-url";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function createOfferLink(applicationId: string, message: string) {
 const [dealer, app, offers] = await Promise.all([getDealerForCurrentUser(), getDealerApplicationForCurrentUser(applicationId), listDealerOffersForApplicationCurrentUser(applicationId)]);
 const offer = offers[0];
 if (!dealer || !canManageDealerMembership(dealer.role) || !app || app.purged_at || app.status !== "offered" || !offer || offer.status !== "pending") throw new Error("Paylaşılabilecek aktif teklif bulunamadı.");
 if (message.length > 2000) throw new Error("Açıklama en fazla 2000 karakter olabilir.");
 const token = randomBytes(32).toString("hex");
 const row: OfferLink = { offer_id: offer.id, token_hash: hash(token), message: message.trim(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), response: null, responded_at: null };
 if (isLocalDataMode()) await mutateLocalData(data => { data.offer_links = [...(data.offer_links ?? []).filter(l => l.offer_id !== offer.id), row]; });
 else { const {error} = await createSupabaseServiceClient().from("offer_links").upsert(row); if (error) throw new Error("Bağlantı oluşturulamadı."); }
 return getPublicSiteOrigin() + "/teklif/" + token;
}

export async function readPublicOffer(token: string) {
 if (!validOfferToken(token)) return null;
 const tokenHash = hash(token);
 const local = isLocalDataMode() ? await readLocalData() : null;
 const db = local ? null : createSupabaseServiceClient();
 const link = local ? local.offer_links?.find(l => l.token_hash === tokenHash) : (await db!.from("offer_links").select("*").eq("token_hash", tokenHash).maybeSingle()).data;
 if (!link || Date.parse(link.expires_at) <= Date.now()) return null;
 const offer = local ? local.offers.find(o => o.id === link.offer_id) : (await db!.from("offers").select("*").eq("id",link.offer_id).maybeSingle()).data;
 if (!offer || offer.status !== "pending") return null;
 const app = local ? local.applications.find(a => a.id === offer.application_id) : (await db!.from("applications").select("*").eq("id",offer.application_id).maybeSingle()).data;
 if (!app || app.purged_at || !app.submitted_at || app.status !== "offered") return null;
 const latest = local ? local.offers.filter(o => o.application_id === app.id).sort((a,b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))[0] : (await db!.from("offers").select("id").eq("application_id",app.id).order("created_at",{ascending:false}).order("id",{ascending:false}).limit(1).maybeSingle()).data;
 const dealer = local ? local.dealers.find(d => d.id === app.dealer_id) : (await db!.from("dealers").select("name,is_active").eq("id",app.dealer_id).maybeSingle()).data;
 if (!dealer?.is_active || latest?.id !== offer.id) return null;
 return { dealerName: dealer.name, vehicle: [app.brand,app.model,app.model_year,app.vehicle_package].filter(Boolean).join(" · "), km: app.km, amount: offer.amount, currency: offer.currency, message: link.message, expiresAt: link.expires_at, response: link.response };
}

export async function respondPublicOffer(token: string, response: string) {
 if (!validOfferToken(token) || !["interested","contact"].includes(response)) return false;
 if (!isLocalDataMode()) { const {data,error} = await createSupabaseServiceClient().rpc("respond_public_offer", {p_hash:hash(token),p_response:response}); return !error && data; }
 return mutateLocalData(data => {
  const l = data.offer_links?.find(l => l.token_hash === hash(token));
  const o = data.offers.find(o => o.id === l?.offer_id);
  const a = data.applications.find(a => a.id === o?.application_id);
  if (!l || !o || !a || a.purged_at || !a.submitted_at || a.status !== "offered" || o.status !== "pending" || Date.parse(l.expires_at) <= Date.now() || !data.dealers.some(d => d.id === a.dealer_id && d.is_active) || data.offers.some(other => other.application_id === a.id && (other.created_at > o.created_at || (other.created_at === o.created_at && other.id > o.id)))) return false;
  if (l.response) return true;
  l.response = response; l.responded_at = new Date().toISOString(); a.updated_at = l.responded_at;
  data.application_followups.push({id:randomUUID(), application_id:a.id, note: response === "interested" ? "Müşteri teklif bağlantısından: İlgileniyorum." : "Müşteri teklif bağlantısından: Görüşmek istiyorum.", created_at:l.responded_at, created_by:null, reminder_at:null, completed_at:null});
  return true;
 });
}

export async function similarApplications(applicationId: string) {
 const app = await getDealerApplicationForCurrentUser(applicationId);
 if (!app || app.purged_at || !normalizePhone(app.owner_phone)) return [];
 const local = isLocalDataMode() ? await readLocalData() : null;
 // Phone narrows the database query; vehicle matching ignores spacing and punctuation.
 const rows = local ? local.applications.filter(a => a.dealer_id === app.dealer_id) : (await createSupabaseServiceClient().from("applications").select("id,reference_code,owner_phone,brand,model,created_at,status,purged_at,submitted_at").eq("dealer_id",app.dealer_id).eq("owner_phone",app.owner_phone!).is("purged_at",null).not("submitted_at","is",null).order("created_at",{ascending:false})).data ?? [];
 return rows.filter(a => a.id !== app.id && !a.purged_at && a.submitted_at && normalizePhone(a.owner_phone) === normalizePhone(app.owner_phone) && normalizeMatch(a.brand) === normalizeMatch(app.brand) && normalizeMatch(a.model) === normalizeMatch(app.model)).sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0,5).map(a => ({id:a.id, reference:a.reference_code, date:a.created_at, status:a.status}));
}
