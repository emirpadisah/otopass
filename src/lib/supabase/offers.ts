import { createSupabaseServiceClient } from "./service";
import { getDealerForCurrentUser } from "./queries";
import { canManageDealerMembership } from "@/lib/auth/route";
import { isLocalDataMode } from "@/lib/data-mode";
import { createLocalOffer, markLocalApplicationAsSold } from "@/lib/local/repository";

export async function createOfferForCurrentDealer(input: {
  applicationId: string;
  amount: number;
  notes: string | null;
}) {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) throw new Error("Galeri hesabı gerekli.");
  if (!canManageDealerMembership(dealer.role)) {
    throw new Error("Bu işlem için galeri yönetim yetkisi gerekli.");
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > 1_000_000_000) {
    throw new Error("Teklif tutarı 0 ile 1.000.000.000 TL arasında olmalıdır.");
  }
  if (input.notes && input.notes.length > 2000) {
    throw new Error("Teklif notu en fazla 2000 karakter olabilir.");
  }

  if (isLocalDataMode()) {
    await createLocalOffer({
      applicationId: input.applicationId,
      dealerId: dealer.dealer_id,
      amount: input.amount,
      notes: input.notes,
    });
    return;
  }

  const supabase = createSupabaseServiceClient();
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, dealer_id")
    .eq("id", input.applicationId)
    .eq("dealer_id", dealer.dealer_id)
    .maybeSingle();
  if (appError) throw appError;
  if (!application) throw new Error("Başvuru bulunamadı.");

  const { data: createdOffer, error: offerError } = await supabase
    .from("offers")
    .insert({
      application_id: input.applicationId,
      dealer_id: dealer.dealer_id,
      amount: input.amount,
      notes: input.notes,
    })
    .select("id")
    .single();
  if (offerError) throw offerError;

  const { error: statusError } = await supabase
    .from("applications")
    .update({ status: "offered" })
    .eq("id", input.applicationId)
    .eq("dealer_id", dealer.dealer_id);
  if (statusError) {
    if (createdOffer?.id) {
      await supabase.from("offers").delete().eq("id", createdOffer.id);
    }
    throw statusError;
  }
}

export async function markApplicationAsSoldForCurrentDealer(applicationId: string) {
  if (!applicationId.trim()) throw new Error("Başvuru seçimi geçersiz.");

  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) throw new Error("Galeri hesabı gerekli.");
  if (!canManageDealerMembership(dealer.role)) {
    throw new Error("Bu işlem için galeri yönetim yetkisi gerekli.");
  }

  if (isLocalDataMode()) {
    await markLocalApplicationAsSold(applicationId, dealer.dealer_id);
    return;
  }

  const supabase = createSupabaseServiceClient();
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, dealer_id")
    .eq("id", applicationId)
    .eq("dealer_id", dealer.dealer_id)
    .maybeSingle();

  if (appError) throw appError;
  if (!application) throw new Error("Başvuru bulunamadı.");

  const { error: statusError } = await supabase.from("applications").update({ status: "sold" }).eq("id", applicationId);
  if (statusError) throw statusError;
}
