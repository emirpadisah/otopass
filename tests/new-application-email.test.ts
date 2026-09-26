import { describe, expect, it } from "vitest";
import { buildNewApplicationEmail } from "../src/lib/notifications/new-application-template";

describe("new application email", () => {
  it("links to the protected dealer page and excludes customer contact details", () => {
    const email = buildNewApplicationEmail({
      id: "12345678-1234-1234-1234-123456789012",
      dealerId: "dealer-id",
      referenceCode: "OTP-20260926-ABCDEF12",
      brand: "Ford",
      model: "Focus",
      modelYear: 2020,
    }, "https://www.otokopru.com");
    expect(email.text).toContain("Ford Focus 2020");
    expect(email.text).toContain("OTP-20260926-ABCDEF12");
    expect(email.html).toContain("https://www.otokopru.com/dealer/applications/12345678-1234-1234-1234-123456789012");
    expect(email.html).not.toContain("Telefon");
  });

  it("escapes vehicle fields before inserting them into HTML", () => {
    const email = buildNewApplicationEmail({
      id: "12345678-1234-1234-1234-123456789012",
      dealerId: "dealer-id",
      referenceCode: "OTP-20260926-ABCDEF12",
      brand: "<script>alert(1)</script>",
      model: "A&B",
      modelYear: null,
    }, "https://www.otokopru.com");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; A&amp;B");
    expect(email.html).not.toContain("<script>");
  });
});
