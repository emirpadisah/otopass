import { describe, expect, it } from "vitest";
import { buttonVariants } from "../src/components/ui/button";

describe("button variants", () => {
  it("builds primary medium button classes", () => {
    const classes = buttonVariants({ variant: "primary", size: "md" });
    expect(classes).toContain("bg-[var(--accent)]");
    expect(classes).toContain("h-10");
  });

  it("builds secondary small button classes", () => {
    const classes = buttonVariants({ variant: "secondary", size: "sm" });
    expect(classes).toContain("bg-[var(--surface-2)]");
    expect(classes).toContain("h-9");
  });
});
