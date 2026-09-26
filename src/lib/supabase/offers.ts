import { canManageDealerMembership } from "@/lib/auth/route";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalOffer, markLocalApplicationAsSold, respondToLocalOffer } from "@/lib/local/repository";
import type { OfferStatus } from "@/lib/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";
import { getDealerForCurrentUser } from "./queries";
import { createSupabaseServerClient } from "./server";

async function logOfferAuthorizationFailure(
  supabase: SupabaseClient<Database>,
  dealerId: string,
  applicationId: string,
  verifiedUserId: string,
  jwtRole: unknown,
  authorizationObserved: () => boolean,
) {
  try {
    const [access, profile] = await Promise.all([
      supabase.rpc("current_user_can_manage_dealer", { _dealer_id: dealerId }),
      supabase.from("user_profiles").select("user_id").eq("user_id", verifiedUserId).maybeSingle(),
    ]);
    console.error("OFFER_AUTH_DIAGNOSTIC", {
      applicationId,
      dealerId,
      verifiedUserId,
      jwtRole: typeof jwtRole === "string" ? jwtRole : null,
      authorizationObserved: authorizationObserved(),
      databaseCanManage: access.data,
      databaseCheckCode: access.error?.code ?? null,
      ownProfileVisible: !!profile.data,
      ownProfileCode: profile.error?.code ?? null,
    });
  } catch (diagnosticError) {
    console.error("OFFER_AUTH_DIAGNOSTIC_FAILED", diagnosticError instanceof Error ? diagnosticError.message : "UNKNOWN");
  }
}

async function createAuthenticatedWorkflowClient() {
  const sessionClient = await createSupabaseServerClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Oturumunuz sona erdi. Lütfen yeniden giriş yapın.");

  const { data: claimsData, error: claimsError } = await sessionClient.auth.getClaims(accessToken);
  const context = await getRequestAccessContext();
  const verifiedUserId = claimsData?.claims?.sub;
  if (claimsError || !verifiedUserId || verifiedUserId !== context?.user.id) {
    throw new Error("Oturumunuz doğrulanamadı. Lütfen yeniden giriş yapın.");
  }

  const { url, anonKey } = getSupabasePublicEnv();
  let authorizationObserved = false;
  const supabase = createClient<Database>(url, anonKey, {
    accessToken: async () => accessToken,
    global: {
      fetch: async (input, init) => {
        authorizationObserved = new Headers(init?.headers).get("authorization") === `Bearer ${accessToken}`;
        return fetch(input, init);
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { supabase, verifiedUserId, jwtRole: claimsData.claims.role, authorizationObserved: () => authorizationObserved };
}

function assertManager(role: string | undefined): void {
  if (!role || !canManageDealerMembership(role)) throw new Error("Bu işlem için galeri yönetim yetkisi gerekli.");
}

function mapWorkflowError(error: { message?: string } | null, fallback: string): Error {
  const message = error?.message ?? "";
  if (message.includes("INVALID_APPLICATION_STATE")) return new Error("Bu başvuruya mevcut durumunda teklif verilemez.");
  if (message.includes("INVALID_OFFER_STATE")) return new Error("Bu teklif daha önce sonuçlandırılmış.");
  if (message.includes("OFFER_MUST_BE_ACCEPTED")) return new Error("Satıştan önce teklif kabul edilmelidir.");
  if (message.includes("FORBIDDEN")) return new Error("Bu işlem için yetkiniz bulunmuyor.");
  return new Error(fallback);
}

export async function createOfferForCurrentDealer(input: { applicationId: string; amount: number; notes: string | null }) {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) throw new Error("Galeri hesabı gerekli.");
  assertManager(dealer.role);
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000_000) throw new Error("Teklif tutarı geçersiz.");
  if (input.notes && input.notes.length > 2000) throw new Error("Teklif notu en fazla 2000 karakter olabilir.");
  if (isLocalDataMode()) {
    await createLocalOffer({ applicationId: input.applicationId, dealerId: dealer.dealer_id, amount: input.amount, notes: input.notes });
    return;
  }
  const { supabase, verifiedUserId, jwtRole, authorizationObserved } = await createAuthenticatedWorkflowClient();
  const { error } = await supabase.rpc("create_dealer_offer", { p_application_id: input.applicationId, p_amount: input.amount, p_currency: "TRY", p_notes: input.notes });
  if (error?.message.includes("FORBIDDEN")) await logOfferAuthorizationFailure(supabase, dealer.dealer_id, input.applicationId, verifiedUserId, jwtRole, authorizationObserved);
  if (error) throw mapWorkflowError(error, "Teklif oluşturulamadı.");
}

export async function respondToOfferForCurrentDealer(input: { offerId: string; response: Exclude<OfferStatus, "pending">; note: string | null }) {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) throw new Error("Galeri hesabı gerekli.");
  assertManager(dealer.role);
  if (input.note && input.note.length > 2000) throw new Error("Yanıt notu en fazla 2000 karakter olabilir.");
  if (isLocalDataMode()) {
    await respondToLocalOffer(input.offerId, dealer.dealer_id, input.response, input.note);
    return;
  }
  const { supabase } = await createAuthenticatedWorkflowClient();
  const { error } = await supabase.rpc("respond_to_dealer_offer", { p_offer_id: input.offerId, p_response: input.response, p_note: input.note });
  if (error) throw mapWorkflowError(error, "Teklif yanıtı kaydedilemedi.");
}

export async function markApplicationAsSoldForCurrentDealer(applicationId: string) {
  if (!applicationId.trim()) throw new Error("Başvuru seçimi geçersiz.");
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) throw new Error("Galeri hesabı gerekli.");
  assertManager(dealer.role);
  if (isLocalDataMode()) {
    await markLocalApplicationAsSold(applicationId, dealer.dealer_id);
    return;
  }
  const { supabase } = await createAuthenticatedWorkflowClient();
  const { error } = await supabase.rpc("mark_dealer_application_sold", { p_application_id: applicationId });
  if (error) throw mapWorkflowError(error, "Satış durumu kaydedilemedi.");
}
