"use server";

import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { checkFormCooldown, registerFormSubmit } from "@/lib/security/rate-limit";
import { parseApplicationInput, validatePhotoFiles } from "@/lib/validation/application";
import type { ActionResponse } from "@/lib/types";

function getClientIp(headerBag: Headers): string {
  return (
    headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerBag.get("x-real-ip") ||
    "0.0.0.0"
  );
}

export async function submitApplication(
  _prevState: ActionResponse,
  formData: FormData
): Promise<ActionResponse> {
  try {
    if (String(formData.get("website") ?? "").trim() !== "") {
      return { ok: true, code: "BOT_DROPPED" };
    }

    const input = parseApplicationInput(formData);
    const headerBag = await headers();
    const ip = getClientIp(headerBag);

    const cooldownAllowed = await checkFormCooldown(ip, input.dealer_slug);
    if (!cooldownAllowed) {
      return { ok: false, code: "RATE_LIMIT", message: "Please wait before submitting again." };
    }

    const dealer = await getDealerBySlug(input.dealer_slug);
    if (!dealer) {
      return { ok: false, code: "DEALER_NOT_FOUND", message: "Dealer was not found." };
    }

    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0);
    validatePhotoFiles(files);

    const supabase = createSupabaseServiceClient();
    const photo_paths: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const filename = `${dealer.slug}/${Date.now()}-${i}-${file.name}`.replace(/\s+/g, "-");
      const { error: uploadError } = await supabase.storage
        .from("applications")
        .upload(filename, file, { upsert: false });
      if (uploadError) {
        return { ok: false, code: "UPLOAD_FAILED", message: "Photo upload failed." };
      }
      photo_paths.push(filename);
    }

    const { error: insertError } = await supabase.from("applications").insert({
      dealer_id: dealer.id,
      dealer_slug: input.dealer_slug,
      owner_name: input.owner_name,
      owner_phone: input.owner_phone,
      brand: input.brand,
      model: input.model,
      model_year: input.model_year,
      km: input.km,
      fuel_type: input.fuel_type,
      transmission: input.transmission,
      tramer_info: input.tramer_info,
      damage_info: input.damage_info,
      photo_paths,
    });

    if (insertError) {
      return { ok: false, code: "INSERT_FAILED", message: "Application could not be saved." };
    }

    await registerFormSubmit(ip, dealer.slug);
    return { ok: true, code: "APPLICATION_CREATED", message: "Your application was submitted." };
  } catch (error) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}
