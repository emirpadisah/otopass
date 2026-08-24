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
  await page.getByLabel(/Ad soyad/).fill("E2E Kullanici");
  const projectDigit = testInfo.project.name === "mobile-chromium" ? "2" : "1";
  const nationalPhone = `555${projectDigit}${String(Date.now()).slice(-6)}`;
  await page.getByLabel(/Telefon numarası/).fill(`0${nationalPhone}`);
  await expect(page.getByLabel(/Telefon numarası/)).toHaveValue(`+90${nationalPhone}`);
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByLabel("Marka").fill("Volkswagen");
  await page.getByRole("textbox", { name: /^Model / }).fill("Golf");
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByRole("group", { name: "Parçaya uygulanacak durum" }).getByText("Boyalı", { exact: true }).click();
  await page.getByRole("button", { name: /Kaput, mevcut durum Orijinal/ }).click();
  await expect(page.getByRole("button", { name: /Kaput, mevcut durum Boyalı/ })).toBeVisible();
  await page.getByLabel(/KVKK aydınlatma metnini/).check();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();

  await expect(page.getByRole("status")).toContainText("Başvuru referansı", { timeout: 15_000 });
});

test("landing pricing and contact form prepare a WhatsApp inquiry", async ({ page }) => {
  await page.addInitScript(() => {
    const testWindow = window as typeof window & { __contactUrl?: string };
    testWindow.__contactUrl = "";
    window.open = ((url?: string | URL) => {
      testWindow.__contactUrl = String(url || "");
      return window;
    }) as typeof window.open;
  });

  await page.goto("/");
  const pricingCards = page.locator(".vc-pricing-card");
  await expect(pricingCards).toHaveCount(2);
  await expect(pricingCards.nth(0)).toContainText("₺5.000");
  await expect(pricingCards.nth(1)).toContainText("₺50.000");

  const monthlyFeatures = await pricingCards.nth(0).locator(".vc-pricing-features li").allTextContents();
  const annualFeatures = await pricingCards.nth(1).locator(".vc-pricing-features li").allTextContents();
  expect(annualFeatures).toEqual(monthlyFeatures);

  await page.getByLabel("Ad soyad").fill("E2E Galeri");
  await page.getByLabel("Telefon veya e-posta").fill("galeri@example.com");
  await page.getByLabel("Mesajınız").fill("Kurulum hakkında bilgi almak istiyorum.");
  await page.getByRole("button", { name: "WhatsApp'ta gönder" }).click();

  await expect(page.getByRole("status")).toContainText("WhatsApp görüşmesi açıldı");
  const openedUrl = await page.evaluate(() => (window as typeof window & { __contactUrl?: string }).__contactUrl);
  expect(openedUrl).toContain("https://wa.me/905536845821");
  expect(decodeURIComponent(openedUrl || "")).toContain("E2E Galeri");
  expect(decodeURIComponent(openedUrl || "")).toContain("galeri@example.com");
});
