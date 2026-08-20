import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/login", "/form/test-galeri"]) {
  test(`${path} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    const revealItems = page.locator("[data-reveal]");
    if (await revealItems.count()) {
      await expect(page.locator(".vc-root")).toHaveClass(/vc-motion-ready/);
      await page.locator(".vc-root").evaluate((element) => element.classList.remove("vc-motion-ready"));
    }
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target.join(" ")),
    }))).toEqual([]);
  });
}

test("public application can be submitted in local demo mode", async ({ page }, testInfo) => {
  await page.goto("/form/test-galeri");
  await page.getByLabel(/Araç Sahibi Adı/).fill("E2E Kullanici");
  await page.getByLabel("Telefon").fill("0555 111 22 33");
  await page.getByRole("textbox", { name: /^E-posta/ }).fill(`e2e+${testInfo.project.name}@example.com`);
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByLabel("Marka").fill("Volkswagen");
  await page.getByRole("textbox", { name: /^Model / }).fill("Golf");
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByLabel(/KVKK aydınlatma metnini/).check();
  await page.getByRole("button", { name: "Teklif talebini gönder" }).click();

  await expect(page.getByRole("status")).toContainText("Referans");
});
