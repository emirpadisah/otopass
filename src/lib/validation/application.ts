import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";
import type { ApplicationInput } from "@/lib/types";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 10;
export const PRIVACY_NOTICE_VERSION = "2026-08-17";

export type PhotoDescriptor = {
  name: string;
  contentType: (typeof ACCEPTED_IMAGE_TYPES)[number];
  size: number;
};

const nullableText = (max: number) =>
  z.union([z.string().trim().max(max), z.null(), z.undefined()]).transform((value) =>
    typeof value === "string" && value.length > 0 ? value : null
  );

const nullableInteger = (min: number, max: number) =>
  z.union([z.number().int(), z.string(), z.null(), z.undefined()]).transform((value, context) => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      context.addIssue({ code: "custom", message: "Sayısal alan geçersiz aralıkta." });
      return z.NEVER;
    }
    return parsed;
  });

const applicationSchema = z.object({
  dealer_slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  owner_name: z.string().trim().min(2, "Ad soyad zorunludur.").max(120),
  owner_phone: z.string().trim().min(10, "Telefon zorunludur.").max(32),
  owner_email: z.string().trim().toLowerCase().email("Geçerli bir e-posta adresi girin.").max(254),
  brand: z.string().trim().min(1, "Marka zorunludur.").max(80),
  model: z.string().trim().min(1, "Model zorunludur.").max(80),
  vehicle_package: nullableText(100),
  model_year: nullableInteger(1950, new Date().getFullYear() + 1),
  km: nullableInteger(0, 10_000_000),
  fuel_type: nullableText(50),
  transmission: nullableText(50),
  tramer_info: nullableText(2000),
  damage_info: nullableText(2000),
  privacy_acknowledged: z.boolean().refine(Boolean, "Aydınlatma metnini onaylamalısınız."),
  marketing_consent: z.boolean().default(false),
});

function normalizePhone(value: string): string {
  const phone = parsePhoneNumberFromString(value, "TR");
  if (!phone?.isValid()) throw new Error("Geçerli bir telefon numarası girin.");
  return phone.number;
}

export function parseApplicationPayload(input: unknown): ApplicationInput {
  const result = applicationSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.");
  return { ...result.data, owner_phone: normalizePhone(result.data.owner_phone) };
}

export function parseApplicationInput(formData: FormData): ApplicationInput {
  return parseApplicationPayload({
    dealer_slug: String(formData.get("dealer_slug") ?? ""),
    owner_name: String(formData.get("owner_name") ?? ""),
    owner_phone: String(formData.get("owner_phone") ?? ""),
    owner_email: String(formData.get("owner_email") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    vehicle_package: formData.get("vehicle_package"),
    model_year: formData.get("model_year"),
    km: formData.get("km"),
    fuel_type: formData.get("fuel_type"),
    transmission: formData.get("transmission"),
    tramer_info: formData.get("tramer_info"),
    damage_info: formData.get("damage_info"),
    privacy_acknowledged: formData.get("privacy_acknowledged") === "on",
    marketing_consent: formData.get("marketing_consent") === "on",
  });
}

export function validatePhotoDescriptors(input: unknown): PhotoDescriptor[] {
  const result = z.array(z.object({
    name: z.string().trim().min(1).max(180),
    contentType: z.enum(ACCEPTED_IMAGE_TYPES),
    size: z.number().int().positive().max(MAX_FILE_SIZE),
  })).max(MAX_FILES).safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Fotoğraf listesi geçersiz.");
  return result.data;
}

export function validatePhotoFiles(files: File[]): void {
  validatePhotoDescriptors(files.map((file) => ({ name: file.name, contentType: file.type, size: file.size })));
}

export async function validatePhotoContent(files: File[]): Promise<void> {
  for (const file of files) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const webp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57;
    if (!((file.type === "image/jpeg" && jpeg) || (file.type === "image/png" && png) || (file.type === "image/webp" && webp))) {
      throw new Error("Fotoğraf içeriği dosya türüyle eşleşmiyor.");
    }
  }
}
