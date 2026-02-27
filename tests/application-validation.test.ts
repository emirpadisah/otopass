import { describe, it, expect } from "vitest";
import { parseApplicationInput } from "../src/lib/validation/application";

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
});
