"use server";

import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getDealerBySlug } from "@/lib/supabase/queries";
import { checkFormCooldown, registerFormSubmit } from "@/lib/security/rate-limit";
import { parseApplicationInput, validatePhotoFiles } from "@/lib/validation/application";
import type { ActionResponse } from "@/lib/types";

const STORAGE_BUCKET = "applications";

type DbError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type ApplicationInsert = Database["public"]["Tables"]["applications"]["Insert"];

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

function isMissingColumn(error: DbError | null, column: string): boolean {
  if (!error?.message) return false;
  const message = error.message.toLowerCase();
  const code = error.code ?? "";
  return (code === "42703" || code === "PGRST204") && message.includes(column.toLowerCase());
}

async function ensureApplicationsBucket(supabase: SupabaseClient<Database>): Promise<ActionResponse | null> {
  const { data: bucket, error: getBucketError } = await supabase.storage.getBucket(STORAGE_BUCKET);
  if (bucket) return null;

  if (getBucketError && !isBucketMissing(getBucketError)) {
    return { ok: false, code: "UPLOAD_CONFIG_FAILED", message: "Fotograf alani kontrol edilemedi." };
  }

  const { error: createBucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
    public: false,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (createBucketError && !isAlreadyExists(createBucketError)) {
    return { ok: false, code: "UPLOAD_CONFIG_FAILED", message: "Fotograf alani olusturulamadi." };
  }

  return null;
}

async function cleanupUploadedPhotos(supabase: SupabaseClient<Database>, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(paths);
  if (error) {
    console.error("Failed to cleanup uploaded photos", {
      code: error.name,
      message: error.message,
      pathsCount: paths.length,
    });
  }
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
      return { ok: false, code: "RATE_LIMIT", message: "Lutfen tekrar denemeden once bekleyin." };
    }

    const dealer = await getDealerBySlug(input.dealer_slug);
    if (!dealer) {
      return { ok: false, code: "DEALER_NOT_FOUND", message: "Galeri bulunamadi." };
    }

    const files = formData
      .getAll("photos")
      .filter((value): value is File => value instanceof File && value.size > 0);
    validatePhotoFiles(files);

    const supabase = createSupabaseServiceClient();
    const bucketCheck = await ensureApplicationsBucket(supabase);
    if (bucketCheck) return bucketCheck;

    const photoPaths: string[] = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const filename = `${dealer.slug}/${Date.now()}-${i}-${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filename, file, { upsert: false });

      if (uploadError) {
        await cleanupUploadedPhotos(supabase, photoPaths);
        return {
          ok: false,
          code: "UPLOAD_FAILED",
          message: `Fotograf yukleme basarisiz: ${uploadError.message}`,
        };
      }

      photoPaths.push(filename);
    }

    let insertPayload: ApplicationInsert = {
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
      photo_paths: photoPaths,
    };

    let insertError: DbError | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { error } = await supabase.from("applications").insert(insertPayload);
      insertError = error as DbError | null;
      if (!insertError) break;

      if ("vehicle_package" in insertPayload && isMissingColumn(insertError, "vehicle_package")) {
        insertPayload = { ...insertPayload, vehicle_package: undefined };
        continue;
      }

      if ("photo_paths" in insertPayload && isMissingColumn(insertError, "photo_paths")) {
        await cleanupUploadedPhotos(supabase, photoPaths);
        insertPayload = { ...insertPayload, photo_paths: undefined };
        continue;
      }

      break;
    }

    if (insertError) {
      await cleanupUploadedPhotos(supabase, photoPaths);
      console.error("Application insert failed", insertError);
      return {
        ok: false,
        code: "INSERT_FAILED",
        message: `Basvuru kaydedilemedi: ${insertError.message ?? "Bilinmeyen hata."}`,
      };
    }

    await registerFormSubmit(ip, dealer.slug);
    return { ok: true, code: "APPLICATION_CREATED", message: "Basvurunuz basariyla gonderildi." };
  } catch (error) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      message: error instanceof Error ? error.message : "Beklenmeyen bir hata olustu",
    };
  }
}
