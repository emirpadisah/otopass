import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../src/components/ui/status-badge";

describe("status badge", () => {
  it("renders mapped status labels", () => {
    const pendingHtml = renderToStaticMarkup(createElement(StatusBadge, { status: "pending" }));
    expect(pendingHtml).toContain("Beklemede");

    const offeredHtml = renderToStaticMarkup(createElement(StatusBadge, { status: "offered" }));
    expect(offeredHtml).toContain("Teklif Verildi");
  });

  it("renders unknown status as label fallback", () => {
    const customHtml = renderToStaticMarkup(createElement(StatusBadge, { status: "unknown_state" }));
    expect(customHtml).toContain("unknown_state");
  });
});
