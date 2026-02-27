"use server";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/database.types";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { checkFormCooldown, registerFormSubmit } from "@/lib/security/rate-limit";
import { parseApplicationInput, validatePhotoFiles } from "@/lib/validation/application";
import type { ActionResponse } from "@/lib/types";

const STORAGE_BUCKET = "applications";

function getClientIp(headerBag: Headers): string {
  return (
    headerBag.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerBag.get("x-real-ip") ||
    "0.0.0.0"
  );
}

function sanitizeFileName(name: string): string {
  const normalized = name.normalize("NFKD").replace(/[^\w.-]+/g, "-");
  const cleaned = normalized.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "photo";
}

function isMissingVehiclePackageColumn(error: { code?: string; message?: string } | null): boolean {
  return (
    error?.code === "42703" &&
    typeof error.message === "string" &&
    error.message.toLowerCase().includes("vehicle_package")
  );
}

function isBucketMissing(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes("not found") || message.includes("does not exist");
}

function isAlreadyExists(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  return message.includes("already exists") || message.includes("duplicate");
}

async function ensureApplicationsBucket(supabase: SupabaseClient<Database>): Promise<ActionResponse | null> {
  const { data: bucket, error: getBucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (bucket) return null;

  if (getBucketError && !isBucketMissing(getBucketError)) {
    return { ok: false, code: "UPLOAD_CONFIG_FAILED", message: "Fotoğraf alanı kontrol edilemedi." };
  }

  const { error: createBucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (createBucketError && !isAlreadyExists(createBucketError)) {
    return { ok: false, code: "UPLOAD_CONFIG_FAILED", message: "Fotoğraf alanı oluşturulamadı." };
  }

  return null;
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
      return { ok: false, code: "RATE_LIMIT", message: "Lütfen tekrar denemeden önce bekleyin." };
    }

    const dealer = await getDealerBySlug(input.dealer_slug);
    if (!dealer) {
      return { ok: false, code: "DEALER_NOT_FOUND", message: "Galeri bulunamadı." };
    }

    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0);
    validatePhotoFiles(files);

    const supabase = createSupabaseServiceClient();
    const bucketCheck = await ensureApplicationsBucket(supabase);
    if (bucketCheck) return bucketCheck;

    const photo_paths: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const filename = `${dealer.slug}/${Date.now()}-${i}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filename, file, { upsert: false });

      if (uploadError) {
        return {
          ok: false,
          code: "UPLOAD_FAILED",
          message: `Fotoğraf yükleme başarısız: ${uploadError.message}`,
        };
      }

      photo_paths.push(filename);
    }

    const insertPayload = {
      dealer_id: dealer.id,
      dealer_slug: input.dealer_slug,
      owner_name: input.owner_name,
      owner_phone: input.owner_phone,
      brand: input.brand,
      model: input.model,
      vehicle_package: input.vehicle_package,
      model_year: input.model_year,
      km: input.km,
      fuel_type: input.fuel_type,
      transmission: input.transmission,
      tramer_info: input.tramer_info,
      damage_info: input.damage_info,
      photo_paths,
    };

    let { error: insertError } = await supabase.from("applications").insert(insertPayload);

    if (isMissingVehiclePackageColumn(insertError)) {
      const { vehicle_package: _ignoredVehiclePackage, ...legacyInsertPayload } = insertPayload;
      const retry = await supabase.from("applications").insert(legacyInsertPayload);
      insertError = retry.error;
    }

    if (insertError) {
      return { ok: false, code: "INSERT_FAILED", message: "Başvuru kaydedilemedi." };
    }

    await registerFormSubmit(ip, dealer.slug);
    return { ok: true, code: "APPLICATION_CREATED", message: "Başvurunuz başarıyla gönderildi." };
  } catch (error) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu",
    };
  }
}
