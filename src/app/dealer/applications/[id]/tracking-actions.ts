"use server";

import { z } from "zod";
import { createTrackingKey, hashTrackingKey } from "@/lib/application-tracking";
import { getRequestAccessContext } from "@/lib/auth/access-context";
import { canManageDealerMembership } from "@/lib/auth/route";
import { isLocalDataMode } from "@/lib/data-mode";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type TrackingKeyActionState = { ok: boolean; message?: string; trackingKey?: string };

export async function rotateTrackingKeyAction(
  _previous: TrackingKeyActionState,
  formData: FormData,
): Promise<TrackingKeyActionState> {
  const applicationId = z.string().uuid().safeParse(formData.get("applicationId"));
  if (!applicationId.success) return { ok: false, message: "Başvuru seçimi geçersiz." };

  const context = await getRequestAccessContext();
  if (!context?.isActive || context.mustChangePassword || !context.dealerId || !context.membershipRole || !canManageDealerMembership(context.membershipRole)) {
    return { ok: false, message: "Bu işlem için galeri yönetim yetkisi gerekli." };
  }
  if (isLocalDataMode()) return { ok: false, message: "Bu özellik yerel demoda kullanılamıyor." };

  try {
    const service = createSupabaseServiceClient();
    const trackingKey = createTrackingKey();
    const { error } = await service.rpc("rotate_application_tracking_key", {
      p_application_id: applicationId.data,
      p_dealer_id: context.dealerId,
      p_actor_user_id: context.user.id,
      p_key_hash: hashTrackingKey(trackingKey.replaceAll("-", "")),
    });
    if (error) throw error;
    return { ok: true, trackingKey, message: "Yeni takip anahtarı oluşturuldu. Önceki anahtar geçersizdir." };
  } catch {
    return { ok: false, message: "Takip anahtarı oluşturulamadı. Lütfen tekrar deneyin." };
  }
}
