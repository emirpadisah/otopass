import { describe, expect, it } from "vitest";
import { DRAFT_TTL, draftKey, hasDraftContent, parseDraft } from "../src/lib/application-draft";
import { getModelSuggestions } from "../src/lib/vehicle-suggestions";

const now = Date.parse("2026-09-06T12:00:00Z");
const draft = { version: 1, savedAt: now, fields: { owner_name: "Deniz", brand: "Renault", model: "Clio" }, bodyCondition: { hood: "painted" }, step: 2, furthestStep: 2 };
describe("application drafts", () => {
  it("restores whitelisted fields and step progress without consent or tokens", () => {
    const parsed = parseDraft(JSON.stringify({ ...draft, fields: { ...draft.fields, privacy_acknowledged: "on", captcha: "secret", website: "bot" } }), now)!;
    expect(parsed.fields).toEqual(draft.fields);
    expect(parsed.step).toBe(2);
    expect(parsed.bodyCondition).toEqual({ hood: "painted" });
  });
  it("isolates dealers and rejects expired or future-dated data", () => {
    expect(draftKey("dealer-a")).not.toBe(draftKey("dealer-b"));
    expect(parseDraft(JSON.stringify({ ...draft, savedAt: now - DRAFT_TTL - 1 }), now)).toBeNull();
    expect(parseDraft(JSON.stringify({ ...draft, savedAt: now + 1 }), now)).toBeNull();
  });
  it.each(["not json", "null", "[]", '{"version":2}', "x".repeat(40_001)])("ignores malformed storage", (raw) => {
    expect(parseDraft(raw, now)).toBeNull();
  });
  it("bounds stored steps and values", () => {
    const parsed = parseDraft(JSON.stringify({ ...draft, fields: { model: "x".repeat(5000) }, step: 99, furthestStep: 1 }), now)!;
    expect(parsed.step).toBe(1);
    expect(parsed.fields.model).toHaveLength(2000);
  });
  it("does not retain an empty form with only the default phone prefix", () => {
    expect(hasDraftContent(parseDraft(JSON.stringify({ ...draft, fields: { owner_phone: "+90" }, bodyCondition: {} }), now)!)).toBe(false);
    expect(hasDraftContent(parseDraft(JSON.stringify(draft), now)!)).toBe(true);
  });
});

describe("vehicle suggestions", () => {
  it("recognizes common aliases and accent-free brand spelling", () => {
    expect(getModelSuggestions(" VW ")).toContain("Golf");
    expect(getModelSuggestions("SKODA")).toContain("Octavia");
    expect(getModelSuggestions("citroen")).toContain("C4");
    expect(getModelSuggestions("mercedes")).toContain("C Serisi");
  });
  it("suggests only models of the selected brand without rejecting unknown brands", () => {
    expect(getModelSuggestions("Renault")).toContain("Clio");
    expect(getModelSuggestions("Renault")).not.toContain("Golf");
    expect(getModelSuggestions("Özel marka")).toEqual([]);
  });
});
