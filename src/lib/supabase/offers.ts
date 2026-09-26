import { canManageDealerMembership } from "@/lib/auth/route";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalOffer, markLocalApplicationAsSold, respondToLocalOffer } from "@/lib/local/repository";
import type { OfferStatus } from "@/lib/types";
import { getDealerForCurrentUser } from "./queries";
import { createSupabaseServerClient } from "./server";
import { createSupabaseServiceClient } from "./service";

async function getVerifiedWorkflowActorId(): Promise<string> {
  const sessionClient = await createSupabaseServerClient();
  const { data: sessionData, error: sessionError } = await sessionClient.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (sessionError || !accessToken) throw new Error("Oturumunuz sona erdi. Lütfen yeniden giriş yapın.");

  const { data: claimsData, error: claimsError } = await sessionClient.auth.getClaims(accessToken);
  const context = await getRequestAccessContext();
  const verifiedUserId = claimsData?.claims?.sub;
  if (claimsError || !verifiedUserId || verifiedUserId !== context?.user.id || !context.isActive) {
    throw new Error("Oturumunuz doğrulanamadı. Lütfen yeniden giriş yapın.");
  }
  return verifiedUserId;
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
  const context = await getRequestAccessContext();
  if (!context?.isActive || !context.dealerId) throw new Error("Galeri hesabı gerekli.");
  assertManager(context.membershipRole ?? undefined);
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000_000) throw new Error("Teklif tutarı geçersiz.");
  if (input.notes && input.notes.length > 2000) throw new Error("Teklif notu en fazla 2000 karakter olabilir.");
  if (isLocalDataMode()) {
    const offer = await createLocalOffer({ applicationId: input.applicationId, dealerId: context.dealerId, amount: input.amount, notes: input.notes });
    return { id: offer.id, amount: offer.amount, currency: offer.currency, notes: offer.notes, createdAt: offer.created_at };
  }
  const service = createSupabaseServiceClient();
  const { data: offer, error } = await service.rpc("create_dealer_offer_for_actor", {
    p_application_id: input.applicationId,
    p_amount: input.amount,
    p_currency: "TRY",
    p_notes: input.notes,
    p_actor_user_id: context.user.id,
  });
  if (error) throw mapWorkflowError(error, "Teklif oluşturulamadı.");
  if (!offer) throw new Error("Teklif oluşturulamadı.");
  return { id: offer.id, amount: offer.amount, currency: offer.currency, notes: offer.notes, createdAt: offer.created_at };
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
  const actorUserId = await getVerifiedWorkflowActorId();
  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("respond_to_dealer_offer_for_actor", {
    p_offer_id: input.offerId,
    p_response: input.response,
    p_note: input.note,
    p_actor_user_id: actorUserId,
  });
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
  const actorUserId = await getVerifiedWorkflowActorId();
  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("mark_dealer_application_sold_for_actor", {
    p_application_id: applicationId,
    p_actor_user_id: actorUserId,
  });
  if (error) throw mapWorkflowError(error, "Satış durumu kaydedilemedi.");
}
