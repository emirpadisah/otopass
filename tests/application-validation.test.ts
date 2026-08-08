import { describe, it, expect } from "vitest";
import {
  parseApplicationInput,
  validatePhotoContent,
  validatePhotoFiles,
} from "../src/lib/validation/application";

function makeForm(data: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    form.set(key, value);
  }
  return form;
}

describe("application validation", () => {
  it("requires dealer_slug, brand, model", () => {
    expect(() => parseApplicationInput(makeForm({}))).toThrow();
    expect(() =>
      parseApplicationInput(makeForm({ dealer_slug: "demo", brand: "VW", model: "Golf" }))
    ).not.toThrow();
  });

  it("validates year range", () => {
    expect(() =>
      parseApplicationInput(makeForm({ dealer_slug: "demo", brand: "VW", model: "Golf", model_year: "1900" }))
    ).toThrow();
  });

  it("parses vehicle_package as optional text", () => {
    const parsed = parseApplicationInput(
      makeForm({ dealer_slug: "demo", brand: "VW", model: "Golf", vehicle_package: "R-Line" })
    );
    expect(parsed.vehicle_package).toBe("R-Line");
  });

  it("rejects invalid phone, kilometer and overlong text values", () => {
    const base = { dealer_slug: "demo", brand: "VW", model: "Golf" };
    expect(() => parseApplicationInput(makeForm({ ...base, owner_phone: "123" }))).toThrow(
      "Telefon numarası"
    );
    expect(() => parseApplicationInput(makeForm({ ...base, km: "-1" }))).toThrow("KM değeri");
    expect(() => parseApplicationInput(makeForm({ ...base, brand: "x".repeat(81) }))).toThrow(
      "Marka en fazla"
    );
  });

  it("accepts a matching PNG signature and rejects spoofed image content", async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validPng = new File([pngBytes], "vehicle.png", { type: "image/png" });
    const spoofedPng = new File(["plain text"], "vehicle.png", { type: "image/png" });

    expect(() => validatePhotoFiles([validPng])).not.toThrow();
    await expect(validatePhotoContent([validPng])).resolves.toBeUndefined();
    await expect(validatePhotoContent([spoofedPng])).rejects.toThrow("dosya türüyle eşleşmiyor");
  });
});
