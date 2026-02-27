import type { ApplicationInput } from "@/lib/types";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

export function parseApplicationInput(formData: FormData): ApplicationInput {
  const dealer_slug = String(formData.get("dealer_slug") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const vehicle_package = toNullableText(formData.get("vehicle_package"));
  const owner_name = toNullableText(formData.get("owner_name"));
  const owner_phone = toNullableText(formData.get("owner_phone"));
  const fuel_type = toNullableText(formData.get("fuel_type"));
  const transmission = toNullableText(formData.get("transmission"));
  const tramer_info = toNullableText(formData.get("tramer_info"));
  const damage_info = toNullableText(formData.get("damage_info"));
  const model_year = toNullableNumber(formData.get("model_year"));
  const km = toNullableNumber(formData.get("km"));

  if (!dealer_slug) throw new Error("Galeri slug bilgisi zorunludur.");
  if (!brand || !model) throw new Error("Marka ve model zorunludur.");
  if (model_year !== null && (model_year < 1950 || model_year > new Date().getFullYear() + 1)) {
    throw new Error("Model yılı geçersiz aralıkta.");
  }
  if (km !== null && km < 0) throw new Error("KM değeri 0 veya büyük olmalıdır.");

  return {
    dealer_slug,
    owner_name,
    owner_phone,
    brand,
    model,
    vehicle_package,
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
  if (!Number.isFinite(number)) throw new Error("Sayısal alan geçersiz.");
  return number;
}

export function validatePhotoFiles(files: File[]): void {
  if (files.length > MAX_FILES) throw new Error(`En fazla ${MAX_FILES} fotoğraf yüklenebilir.`);
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Her fotoğraf en fazla 10 MB olabilir.");
    }
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Sadece JPG, PNG veya WEBP dosyaları kabul edilir.");
    }
  }
}
