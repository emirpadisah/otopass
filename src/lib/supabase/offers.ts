import { createSupabaseServerClient } from "./server";
import { getDealerForCurrentUser } from "./queries";

export async function createOfferForCurrentDealer(input: {
  applicationId: string;
  amount: number;
  notes: string | null;
}) {
  const dealer = await getDealerForCurrentUser();
  if (!dealer?.dealer_id) throw new Error("Dealer account is required.");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Offer amount is invalid.");

  const supabase = await createSupabaseServerClient();
  const { data: application, error: appError } = await supabase
    .from("applications")
    .select("id, dealer_id")
    .eq("id", input.applicationId)
    .eq("dealer_id", dealer.dealer_id)
    .maybeSingle();
  if (appError) throw appError;
  if (!application) throw new Error("Application was not found.");

  const { error: offerError } = await supabase.from("offers").insert({
    application_id: input.applicationId,
    dealer_id: dealer.dealer_id,
    amount: input.amount,
    notes: input.notes,
  });
  if (offerError) throw offerError;

  await supabase.from("applications").update({ status: "offered" }).eq("id", input.applicationId);
}
