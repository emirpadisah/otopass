import { normalizeVehicleBodyCondition, type VehicleBodyCondition } from "./vehicle-condition";

export const DRAFT_FIELDS = ["owner_name", "owner_phone", "brand", "model", "vehicle_package", "engine_info", "model_year", "km", "fuel_type", "transmission", "tramer_info", "damage_info"] as const;
export const DRAFT_TTL = 7 * 24 * 60 * 60 * 1000;
export type ApplicationDraft = {
  version: 1;
  savedAt: number;
  fields: Partial<Record<typeof DRAFT_FIELDS[number], string>>;
  bodyCondition: VehicleBodyCondition;
  step: number;
  furthestStep: number;
};
export function draftKey(dealerSlug: string) { return `otokopru:application-draft:${dealerSlug}`; }

export function parseDraft(raw: string | null, now = Date.now()): ApplicationDraft | null {
  if (!raw || raw.length > 40_000) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || value.version !== 1 || typeof value.savedAt !== "number" || !Number.isFinite(value.savedAt)
      || value.savedAt > now || now - value.savedAt > DRAFT_TTL || !value.fields || typeof value.fields !== "object") return null;
    const fields: ApplicationDraft["fields"] = {};
    for (const name of DRAFT_FIELDS) if (typeof value.fields[name] === "string") fields[name] = value.fields[name].slice(0, 2000);
    const furthestStep = Number.isInteger(value.furthestStep) ? Math.max(0, Math.min(2, value.furthestStep)) : 0;
    return { version: 1, savedAt: value.savedAt, fields, bodyCondition: normalizeVehicleBodyCondition(value.bodyCondition),
      step: Number.isInteger(value.step) ? Math.max(0, Math.min(furthestStep, value.step)) : 0, furthestStep };
  } catch { return null; }
}

export function captureDraft(form: HTMLFormElement): ApplicationDraft {
  const data = new FormData(form);
  const fields: ApplicationDraft["fields"] = {};
  for (const name of DRAFT_FIELDS) fields[name] = String(data.get(name) ?? "").slice(0, 2000);
  let bodyCondition = {};
  try { bodyCondition = normalizeVehicleBodyCondition(JSON.parse(String(data.get("body_condition") ?? "{}"))); } catch { /* Keep an empty condition map. */ }
  return { version: 1, savedAt: Date.now(), fields, bodyCondition,
    step: Number(form.dataset.step ?? 0), furthestStep: Number(form.dataset.furthestStep ?? 0) };
}

export function hasDraftContent(draft: ApplicationDraft) {
  return Object.entries(draft.fields).some(([key, value]) => value?.trim() && !(key === "owner_phone" && value === "+90"))
    || Object.keys(draft.bodyCondition).length > 0;
}
