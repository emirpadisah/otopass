import { describe, expect, it } from "vitest";
import {
  createLegacyFinalizeToken,
  verifyLegacyFinalizeToken,
  type LegacyFinalizePayload,
} from "../src/lib/public-applications";
import {
  isDuplicateKey,
  isMissingColumn,
  isMissingFunction,
  isMissingRelation,
} from "../src/lib/supabase/schema-compat";

const payload: LegacyFinalizePayload = {
  version: 1,
  expiresAt: Date.now() + 60_000,
  sessionId: "11111111-1111-4111-8111-111111111111",
  applicationId: "22222222-2222-4222-8222-222222222222",
  referenceCode: "OTP-20260819-ABCDEF12",
  dealer: { id: "33333333-3333-4333-8333-333333333333", slug: "demo-galeri" },
  application: {
    dealer_slug: "demo-galeri",
    owner_name: "Deniz Yilmaz",
    owner_phone: "+905551112233",
    owner_email: null,
    brand: "Volkswagen",
    model: "Golf",
    vehicle_package: null,
    model_year: 2022,
    km: 50_000,
    fuel_type: "Benzin",
    transmission: "Otomatik",
    tramer_info: null,
    damage_info: null,
    body_condition: { hood: "painted" },
    privacy_acknowledged: true,
  },
  files: [{
    path: "demo-galeri/22222222-2222-4222-8222-222222222222/0-photo.webp",
    name: "photo.webp",
    contentType: "image/webp",
    size: 1024,
  }],
};

describe("legacy signed upload compatibility", () => {
  it("round-trips an untampered finalize payload", () => {
    const token = createLegacyFinalizeToken(payload, "test-secret");
    expect(verifyLegacyFinalizeToken(token, "test-secret")).toEqual(payload);
  });

  it("rejects modified and incorrectly signed tokens", () => {
    const token = createLegacyFinalizeToken(payload, "test-secret");
    expect(verifyLegacyFinalizeToken(`${token.slice(0, -1)}x`, "test-secret")).toBeNull();
    expect(verifyLegacyFinalizeToken(token, "wrong-secret")).toBeNull();
  });
});

describe("Supabase schema compatibility detection", () => {
  it("recognizes missing columns, relations and functions by PostgREST codes", () => {
    expect(isMissingColumn({ code: "PGRST204", message: "Could not find the 'is_active' column" }, "is_active")).toBe(true);
    expect(isMissingRelation({ code: "PGRST205", message: "Could not find public.upload_sessions" }, "upload_sessions")).toBe(true);
    expect(isMissingFunction({ code: "PGRST202", message: "Could not find public.consume_rate_limit" }, "consume_rate_limit")).toBe(true);
  });

  it("recognizes duplicate key failures without masking unrelated errors", () => {
    expect(isDuplicateKey({ code: "23505", message: "duplicate key value" })).toBe(true);
    expect(isMissingColumn({ code: "42501", message: "permission denied" }, "is_active")).toBe(false);
  });
});
