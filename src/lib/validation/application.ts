import type { ApplicationInput } from "@/lib/types";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

export function parseApplicationInput(formData: FormData): ApplicationInput {
  const dealer_slug = String(formData.get("dealer_slug") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const owner_name = toNullableText(formData.get("owner_name"));
  const owner_phone = toNullableText(formData.get("owner_phone"));
  const fuel_type = toNullableText(formData.get("fuel_type"));
  const transmission = toNullableText(formData.get("transmission"));
  const tramer_info = toNullableText(formData.get("tramer_info"));
  const damage_info = toNullableText(formData.get("damage_info"));
  const model_year = toNullableNumber(formData.get("model_year"));
  const km = toNullableNumber(formData.get("km"));

  if (!dealer_slug) throw new Error("Dealer slug is required.");
  if (!brand || !model) throw new Error("Brand and model are required.");
  if (model_year !== null && (model_year < 1950 || model_year > new Date().getFullYear() + 1)) {
    throw new Error("Model year is out of range.");
  }
  if (km !== null && km < 0) throw new Error("KM must be >= 0.");

  return {
    dealer_slug,
    owner_name,
    owner_phone,
    brand,
    model,
    model_year,
    km,
    fuel_type,
    transmission,
    tramer_info,
    damage_info,
  };
}

function toNullableText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length === 0 ? null : text;
}

function toNullableNumber(value: FormDataEntryValue | null): number | null {
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number)) throw new Error("Invalid numeric field.");
  return number;
}

export function validatePhotoFiles(files: File[]): void {
  if (files.length > MAX_FILES) throw new Error(`At most ${MAX_FILES} photos are allowed.`);
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Each photo must be <= 10MB.");
    }
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Only JPG, PNG or WEBP files are allowed.");
    }
  }
}
