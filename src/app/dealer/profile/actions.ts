"use server";

import { revalidatePath } from "next/cache";
import { canManageDealerMembership } from "@/lib/auth/route";
import { requireUser } from "@/lib/auth/session";
import { formatTurkishMobileInput, isTurkishMobileNumber } from "@/lib/phone";
import { parseSocialLinksInput, type SocialLink } from "@/lib/social-links";
import { getDealerForCurrentUser } from "@/lib/supabase/queries";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { ActionResponse } from "@/lib/types";

function nullableText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function tooLong(value: string | null, max: number): boolean {
  return Boolean(value && value.length > max);
}

export async function updateDealerProfileAction(
  _state: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  const actor = await requireUser();
  const membership = await getDealerForCurrentUser();
  if (!membership || !canManageDealerMembership(membership.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Profil düzenleme yetkiniz bulunmuyor." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const contactName = nullableText(formData.get("contactName"));
  const contactPhoneInput = nullableText(formData.get("contactPhone"));
  const contactPhone = contactPhoneInput ? formatTurkishMobileInput(contactPhoneInput) : null;
  const contactEmail = nullableText(formData.get("contactEmail"));
  const privacyEmail = nullableText(formData.get("privacyEmail"));

  if (!name || name.length > 120) {
    return { ok: false, code: "VALIDATION", message: "Galeri adı geçersiz." };
  }
  if (
    tooLong(contactName, 120) ||
    tooLong(contactPhoneInput, 32) ||
    tooLong(contactEmail, 160) ||
    tooLong(privacyEmail, 160)
  ) {
    return { ok: false, code: "VALIDATION", message: "İletişim bilgilerindeki alan uzunluklarını kontrol edin." };
  }
  if (contactPhone && !isTurkishMobileNumber(contactPhone)) {
    return { ok: false, code: "VALIDATION", message: "Telefonu +905xxxxxxxxx biçiminde girin." };
  }
  if ([contactEmail, privacyEmail].some((email) => email && !/^\S+@\S+\.\S+$/.test(email))) {
    return { ok: false, code: "VALIDATION", message: "E-posta adreslerini kontrol edin." };
  }

  let socialLinks: SocialLink[];
  try {
    socialLinks = parseSocialLinksInput(formData.get("socialLinks"));
  } catch (error) {
    return {
      ok: false,
      code: "VALIDATION",
      message: error instanceof Error ? error.message : "Sosyal bağlantılar doğrulanamadı.",
    };
  }

  const service = createSupabaseServiceClient();
  const { data, error } = await service
    .from("dealers")
    .update({
      name,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      privacy_contact_email: privacyEmail,
      social_links: socialLinks,
    })
    .eq("id", membership.dealer_id)
    .select("slug")
    .maybeSingle();

  if (error) {
    return { ok: false, code: "UPDATE_FAILED", message: "Profil güncellenemedi." };
  }

  await service.from("activity_log").insert({
    actor_user_id: actor.id,
    dealer_id: membership.dealer_id,
    action: "DEALER_PROFILE_UPDATED",
    metadata: { social_link_count: socialLinks.length },
  });

  revalidatePath("/dealer/profile");
  if (data?.slug) {
    revalidatePath(`/form/${data.slug}`);
    revalidatePath(`/form/${data.slug}/privacy`);
  }

  return { ok: true, code: "PROFILE_UPDATED", message: "Galeri profili güncellendi." };
}
