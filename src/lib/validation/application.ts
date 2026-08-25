import { z } from "zod";
import { isTurkishMobileNumber } from "@/lib/phone";
import type { ApplicationInput } from "@/lib/types";
import {
  VEHICLE_BODY_PART_IDS,
  VEHICLE_NON_ORIGINAL_STATUSES,
  type VehicleBodyCondition,
} from "@/lib/vehicle-condition";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_FILES = 10;
export const PRIVACY_NOTICE_VERSION = "2026-08-25";

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

const vehiclePartIds = new Set<string>(VEHICLE_BODY_PART_IDS);
const bodyConditionSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value ?? {};
  if (!value.trim()) return {};
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}, z.record(z.string(), z.enum(VEHICLE_NON_ORIGINAL_STATUSES)).superRefine((value, context) => {
  for (const partId of Object.keys(value)) {
    if (!vehiclePartIds.has(partId)) {
      context.addIssue({ code: "custom", path: [partId], message: "Kaporta parçası geçersiz." });
    }
  }
}).transform((value) => value as VehicleBodyCondition));

const applicationSchema = z.object({
  dealer_slug: z.string().trim().min(1).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  owner_name: z.string().trim().min(2, "Ad soyad zorunludur.").max(120),
  owner_phone: z.string().trim().refine(isTurkishMobileNumber, "Telefonu +905xxxxxxxxx biçiminde boşluksuz girin."),
  owner_email: z.unknown().optional().transform(() => null),
  brand: z.string().trim().min(1, "Marka zorunludur.").max(80),
  model: z.string().trim().min(1, "Model zorunludur.").max(80),
  vehicle_package: nullableText(100),
  engine_info: nullableText(120),
  model_year: nullableInteger(1950, new Date().getFullYear() + 1),
  km: nullableInteger(0, 10_000_000),
  fuel_type: nullableText(50),
  transmission: nullableText(50),
  tramer_info: nullableText(2000),
  damage_info: nullableText(2000),
  body_condition: bodyConditionSchema.default({}),
  privacy_acknowledged: z.boolean().refine(Boolean, "Aydınlatma metnini onaylamalısınız."),
});

export function parseApplicationPayload(input: unknown): ApplicationInput {
  const result = applicationSchema.safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Başvuru bilgileri geçersiz.");
  return result.data;
}

export function parseApplicationInput(formData: FormData): ApplicationInput {
  return parseApplicationPayload({
    dealer_slug: String(formData.get("dealer_slug") ?? ""),
    owner_name: String(formData.get("owner_name") ?? ""),
    owner_phone: String(formData.get("owner_phone") ?? ""),
    brand: String(formData.get("brand") ?? ""),
    model: String(formData.get("model") ?? ""),
    vehicle_package: formData.get("vehicle_package"),
    engine_info: formData.get("engine_info"),
    model_year: formData.get("model_year"),
    km: formData.get("km"),
    fuel_type: formData.get("fuel_type"),
    transmission: formData.get("transmission"),
    tramer_info: formData.get("tramer_info"),
    damage_info: formData.get("damage_info"),
    body_condition: formData.get("body_condition"),
    privacy_acknowledged: formData.get("privacy_acknowledged") === "on",
  });
}

export function validatePhotoDescriptors(input: unknown): PhotoDescriptor[] {
  const result = z.array(z.object({
    name: z.string().trim().min(1).max(180),
    contentType: z.enum(ACCEPTED_IMAGE_TYPES),
    size: z.number().int().positive().max(MAX_FILE_SIZE),
  })).min(1, "En az bir araç fotoğrafı zorunludur.").max(MAX_FILES).safeParse(input);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Fotoğraf listesi geçersiz.");
  return result.data;
}

export function validatePhotoFiles(files: File[]): void {
  validatePhotoDescriptors(files.map((file) => ({ name: file.name, contentType: file.type, size: file.size })));
}

export function hasMatchingImageSignature(bytes: Uint8Array, contentType: string): boolean {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89
    && bytes[1] === 0x50
    && bytes[2] === 0x4e
    && bytes[3] === 0x47
    && bytes[4] === 0x0d
    && bytes[5] === 0x0a
    && bytes[6] === 0x1a
    && bytes[7] === 0x0a;
  const webp = bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50;

  return (contentType === "image/jpeg" && jpeg)
    || (contentType === "image/png" && png)
    || (contentType === "image/webp" && webp);
}

export async function validatePhotoContent(files: File[]): Promise<void> {
  for (const file of files) {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!hasMatchingImageSignature(bytes, file.type)) {
      throw new Error("Fotoğraf içeriği dosya türüyle eşleşmiyor.");
    }
  }
}
