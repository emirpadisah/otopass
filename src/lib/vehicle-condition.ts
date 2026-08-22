export const VEHICLE_CONDITION_STATUSES = [
  { value: "original", label: "Orijinal" },
  { value: "local_paint", label: "Lokal boyalı" },
  { value: "painted", label: "Boyalı" },
  { value: "replaced", label: "Değişen" },
] as const;

export const VEHICLE_BODY_PARTS = [
  { id: "front_bumper", label: "Ön tampon" },
  { id: "hood", label: "Kaput" },
  { id: "left_front_fender", label: "Sol ön çamurluk" },
  { id: "right_front_fender", label: "Sağ ön çamurluk" },
  { id: "left_front_door", label: "Sol ön kapı" },
  { id: "right_front_door", label: "Sağ ön kapı" },
  { id: "left_rear_door", label: "Sol arka kapı" },
  { id: "right_rear_door", label: "Sağ arka kapı" },
  { id: "left_rear_fender", label: "Sol arka çamurluk" },
  { id: "right_rear_fender", label: "Sağ arka çamurluk" },
  { id: "roof", label: "Tavan" },
  { id: "trunk", label: "Bagaj kapağı" },
  { id: "rear_bumper", label: "Arka tampon" },
] as const;

export type VehicleConditionStatus = (typeof VEHICLE_CONDITION_STATUSES)[number]["value"];
export type VehicleBodyPartId = (typeof VEHICLE_BODY_PARTS)[number]["id"];
export type VehicleBodyCondition = Partial<Record<VehicleBodyPartId, Exclude<VehicleConditionStatus, "original">>>;

export const VEHICLE_NON_ORIGINAL_STATUSES = ["local_paint", "painted", "replaced"] as const;
export const VEHICLE_BODY_PART_IDS = VEHICLE_BODY_PARTS.map((part) => part.id);

const partIds = new Set<string>(VEHICLE_BODY_PART_IDS);
const statuses = new Set<string>(VEHICLE_NON_ORIGINAL_STATUSES);

export function normalizeVehicleBodyCondition(input: unknown): VehicleBodyCondition {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};

  return Object.fromEntries(
    Object.entries(input).filter(([partId, status]) => partIds.has(partId) && typeof status === "string" && statuses.has(status)),
  ) as VehicleBodyCondition;
}

export function getVehicleConditionStatus(
  condition: VehicleBodyCondition,
  partId: VehicleBodyPartId,
): VehicleConditionStatus {
  return condition[partId] ?? "original";
}

export function getVehicleConditionLabel(status: VehicleConditionStatus): string {
  return VEHICLE_CONDITION_STATUSES.find((item) => item.value === status)?.label ?? "Orijinal";
}
