import { describe, expect, it } from "vitest";
import {
  parseApplicationInput,
  validatePhotoContent,
  validatePhotoDescriptors,
  validatePhotoFiles,
} from "../src/lib/validation/application";
import { formatTurkishMobileInput, getWhatsAppUrl } from "../src/lib/phone";

function makeForm(data: Record<string, string> = {}): FormData {
  const form = new FormData();
  const valid = {
    dealer_slug: "demo",
    owner_name: "Deniz Yilmaz",
    owner_phone: "+905551112233",
    brand: "VW",
    model: "Golf",
    body_condition: '{"hood":"painted"}',
    privacy_acknowledged: "on",
  };

  for (const [key, value] of Object.entries({ ...valid, ...data })) {
    form.set(key, value);
  }

  return form;
}

describe("application validation", () => {
  it("requires identity, vehicle and privacy fields", () => {
    expect(() => parseApplicationInput(new FormData())).toThrow();
    expect(() => parseApplicationInput(makeForm())).not.toThrow();
  });

  it("accepts a strict Turkish mobile number without email", () => {
    const parsed = parseApplicationInput(makeForm({ engine_info: "  1.6 TDI  " }));
    expect(parsed.owner_phone).toBe("+905551112233");
    expect(parsed.owner_email).toBeNull();
    expect(parsed.engine_info).toBe("1.6 TDI");
    expect(parsed.body_condition).toEqual({ hood: "painted" });
    expect(() => parseApplicationInput(makeForm({ owner_phone: "0555 111 22 33" }))).toThrow();
  });

  it("rejects unknown body parts and unsupported condition values", () => {
    expect(() => parseApplicationInput(makeForm({ body_condition: '{"wing":"painted"}' }))).toThrow();
    expect(() => parseApplicationInput(makeForm({ body_condition: '{"hood":"damaged"}' }))).toThrow();
    expect(() => parseApplicationInput(makeForm({ body_condition: "not-json" }))).toThrow();
  });

  it("formats phone input and creates WhatsApp links", () => {
    expect(formatTurkishMobileInput("0555 111 22 33")).toBe("+905551112233");
    expect(formatTurkishMobileInput("+905551112233")).toBe("+905551112233");
    expect(getWhatsAppUrl("0555 111 22 33")).toBe("https://wa.me/905551112233");
    expect(getWhatsAppUrl("+905551112233")).toBe("https://wa.me/905551112233");
  });

  it("validates year, kilometer and text limits", () => {
    expect(() => parseApplicationInput(makeForm({ model_year: "1900" }))).toThrow();
    expect(() => parseApplicationInput(makeForm({ km: "-1" }))).toThrow();
    expect(() => parseApplicationInput(makeForm({ brand: "x".repeat(81) }))).toThrow();
    expect(() => parseApplicationInput(makeForm({ engine_info: "x".repeat(121) }))).toThrow();
  });

  it("validates upload descriptors", () => {
    expect(() =>
      validatePhotoDescriptors([{ name: "arac.webp", contentType: "image/webp", size: 1024 }]),
    ).not.toThrow();
    expect(() =>
      validatePhotoDescriptors([{ name: "arac.svg", contentType: "image/svg+xml", size: 1024 }]),
    ).toThrow();
    expect(() =>
      validatePhotoDescriptors([{ name: "arac.webp", contentType: "image/webp", size: 11 * 1024 * 1024 }]),
    ).toThrow();
  });

  it("accepts a matching PNG signature and rejects spoofed image content", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validPng = new File([pngBytes], "vehicle.png", { type: "image/png" });
    const spoofedPng = new File(["plain text"], "vehicle.png", { type: "image/png" });

    expect(() => validatePhotoFiles([validPng])).not.toThrow();
    await expect(validatePhotoContent([validPng])).resolves.toBeUndefined();
    await expect(validatePhotoContent([spoofedPng])).rejects.toThrow();
  });
});
