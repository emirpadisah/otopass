import type { ApplicationInput } from "@/lib/types";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 10;

function assertMaxLength(value: string | null, maxLength: number, label: string): void {
  if (value && value.length > maxLength) {
    throw new Error(`${label} en fazla ${maxLength} karakter olabilir.`);
  }
}

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
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dealer_slug) || dealer_slug.length > 64) {
    throw new Error("Galeri bağlantısı geçersiz.");
  }
  assertMaxLength(brand, 80, "Marka");
  assertMaxLength(model, 80, "Model");
  assertMaxLength(vehicle_package, 100, "Araç paketi");
  assertMaxLength(owner_name, 120, "Araç sahibi adı");
  assertMaxLength(owner_phone, 32, "Telefon");
  assertMaxLength(fuel_type, 50, "Yakıt tipi");
  assertMaxLength(transmission, 50, "Vites");
  assertMaxLength(tramer_info, 2000, "Tramer bilgisi");
  assertMaxLength(damage_info, 2000, "Hasar bilgisi");
  if (owner_phone) {
    const digitCount = owner_phone.replace(/\D/g, "").length;
    if (digitCount < 10 || digitCount > 15) {
      throw new Error("Telefon numarası 10-15 rakam içermelidir.");
    }
  }
  if (model_year !== null && (model_year < 1950 || model_year > new Date().getFullYear() + 1)) {
    throw new Error("Model yılı geçersiz aralıkta.");
  }
  if (model_year !== null && !Number.isInteger(model_year)) throw new Error("Model yılı tam sayı olmalıdır.");
  if (km !== null && (!Number.isInteger(km) || km < 0 || km > 10_000_000)) {
    throw new Error("KM değeri 0 ile 10.000.000 arasında tam sayı olmalıdır.");
  }

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

export async function validatePhotoContent(files: File[]): Promise<void> {
  for (const file of files) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a;
    const isWebp =
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50;

    const contentMatchesType =
      (file.type === "image/jpeg" && isJpeg) ||
      (file.type === "image/png" && isPng) ||
      (file.type === "image/webp" && isWebp);

    if (!contentMatchesType) {
      throw new Error("Fotoğraf içeriği dosya türüyle eşleşmiyor.");
    }
  }
}
