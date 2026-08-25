import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/login", "/form/test-galeri"]) {
  test(`${path} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
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
  await page.locator("#photos").setInputFiles({
    name: "arac.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAAH/e+m+7wAAAABJRU5ErkJggg==", "base64"),
  });
  await page.getByLabel(/KVKK aydınlatma metnini/).check();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();

  await expect(page.getByRole("status")).toContainText("Başvuru referansı", { timeout: 15_000 });
});

test("public application requires at least one vehicle photo", async ({ page }) => {
  await page.goto("/form/test-galeri");
  await page.getByLabel(/Ad soyad/).fill("Fotoğraf Kontrolü");
  await page.getByLabel(/Telefon numarası/).fill("05551234567");
  await page.getByRole("button", { name: "Devam et" }).click();

  await page.getByLabel("Marka").fill("Volkswagen");
  await page.getByRole("textbox", { name: /^Model / }).fill("Golf");
  await page.getByRole("button", { name: "Devam et" }).click();
  await page.getByLabel(/KVKK aydınlatma metnini/).check();
  await page.getByRole("button", { name: "Başvuruyu gönder" }).click();

  await expect(page.locator(".status-alert[role='alert']")).toContainText("en az bir araç fotoğrafı");
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
  const pricingCards = page.getByTestId("pricing-card");
  await expect(pricingCards).toHaveCount(2);
  await expect(pricingCards.nth(0)).toContainText("₺5.000");
  await expect(pricingCards.nth(1)).toContainText("₺50.000");

  const monthlyFeatures = await pricingCards.nth(0).locator("li").allTextContents();
  const annualFeatures = await pricingCards.nth(1).locator("li").allTextContents();
  expect(annualFeatures.slice(0, -1)).toEqual(monthlyFeatures);
  expect(annualFeatures.at(-1)).toContain("özel domain");

  await page.locator("#iletisim").scrollIntoViewIfNeeded();
  await page.getByLabel("Ad soyad").fill("E2E Galeri");
  await page.getByLabel("Telefon veya e-posta").fill("galeri@example.com");
  await page.getByLabel("Mesajınız").fill("Kurulum hakkında bilgi almak istiyorum.");
  await page.getByRole("button", { name: "WhatsApp'ta görüş" }).click();

  await expect(page.getByRole("status")).toContainText("WhatsApp görüşmesi açıldı");
  const openedUrl = await page.evaluate(() => (window as typeof window & { __contactUrl?: string }).__contactUrl);
  expect(openedUrl).toContain("https://wa.me/905536845821");
  expect(decodeURIComponent(openedUrl || "")).toContain("E2E Galeri");
  expect(decodeURIComponent(openedUrl || "")).toContain("galeri@example.com");
});

test("landing preserves viewport geometry and interaction behavior", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Başvuruyu alın. Aracı değerlendirin. Teklifi sonuçlandırın." })).toBeVisible();

  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    sectionIds: [...document.querySelectorAll("main > section")].map((section) => section.id),
  }));
  expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  expect(geometry.sectionIds).toEqual(["hakkimizda", "", "ozellikler", "", "surec", "fiyatlandirma", "iletisim"]);

  const header = page.locator("header").first();
  const initialHeaderHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
  await page.evaluate(() => window.scrollTo({ top: 180, behavior: "instant" }));
  if (!(await page.getByRole("button", { name: "Menüyü aç" }).isVisible())) {
    await expect.poll(async () => header.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(initialHeaderHeight);
    await page.getByRole("link", { name: "Sistem", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
    await expect(page).toHaveURL(/#ozellikler$/);
  }

  if (await page.getByRole("button", { name: "Menüyü aç" }).isVisible()) {
    await page.getByRole("button", { name: "Menüyü aç" }).click();
    await expect(page.locator("#landing-mobile-menu")).toHaveAttribute("aria-hidden", "false");
    await page.keyboard.press("Escape");
    await expect(page.locator("#landing-mobile-menu")).toHaveAttribute("aria-hidden", "true");
  }
});

test("hero rings animate and respect reduced motion", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Ring animation sampling runs once on desktop Chromium.");

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const ring = page.locator('svg[aria-label="Birbirine bağlı iki süreç halkası"] > g').first();
  const movingTransformOne = await ring.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(500);
  const movingTransformTwo = await ring.evaluate((element) => getComputedStyle(element).transform);
  expect(movingTransformTwo).not.toBe(movingTransformOne);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const reducedRing = page.locator('svg[aria-label="Birbirine bağlı iki süreç halkası"] > g').first();
  const stillTransformOne = await reducedRing.evaluate((element) => getComputedStyle(element).transform);
  await page.waitForTimeout(500);
  const stillTransformTwo = await reducedRing.evaluate((element) => getComputedStyle(element).transform);
  expect(stillTransformTwo).toBe(stillTransformOne);
});
