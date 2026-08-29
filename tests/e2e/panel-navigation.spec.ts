import { expect, test } from "@playwright/test";

async function openMobileNavigationIfNeeded(page: import("@playwright/test").Page) {
  const trigger = page.getByRole("button", { name: "Menüyü aç" });
  if (await trigger.isVisible()) await trigger.click();
}

test("dealer login and panel navigation stay client-side", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile-chromium";
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("/login");
  await page.getByLabel("E-posta").fill(mobile ? "dealer.mobile.e2e@otokopru.local" : "dealer.e2e@otokopru.local");
  await page.getByLabel("Şifre").fill(mobile ? "DealerMobileE2e123!" : "DealerE2e123!");
  await page.getByRole("button", { name: "Giriş yap" }).click();

  await expect(page).toHaveURL(/\/dealer$/);
  await expect(page.getByRole("heading", { name: "Araç başvuruları" })).toBeVisible();

  if (mobile) {
    const mobileTrigger = page.getByRole("button", { name: "Menüyü aç" });
    await expect(mobileTrigger).toHaveCount(1);
    await expect(mobileTrigger).toBeVisible();
    await expect(page.getByRole("button", { name: /Yan menüyü/ })).toHaveCount(0);
    await mobileTrigger.click();
    await expect(page.locator(".ops-sidebar")).toHaveAttribute("data-mobile-open", "true");
    await expect(page.getByRole("button", { name: /tema/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Çıkış yap" })).toBeVisible();
    const screenshotPath = testInfo.outputPath("mobile-navigation.png");
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach("mobile navigation", { path: screenshotPath, contentType: "image/png" });
  } else {
    await expect(page.getByRole("button", { name: "Menüyü aç" })).toHaveCount(0);
    await page.getByRole("button", { name: "Yan menüyü daralt" }).click();
    await expect(page.locator(".ops-sidebar")).toHaveAttribute("data-collapsed", "true");

    const themeBox = await page.getByRole("button", { name: /tema/ }).boundingBox();
    const logoutBox = await page.getByRole("button", { name: "Çıkış yap" }).boundingBox();
    expect(themeBox).not.toBeNull();
    expect(logoutBox).not.toBeNull();
    expect(themeBox?.width).toBeCloseTo(40, 0);
    expect(logoutBox?.width).toBeCloseTo(40, 0);
    expect(themeBox?.x).toBeCloseTo(logoutBox?.x ?? 0, 0);

    const screenshotPath = testInfo.outputPath("collapsed-sidebar.png");
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach("collapsed sidebar", { path: screenshotPath, contentType: "image/png" });

    await page.getByRole("button", { name: "Yan menüyü genişlet" }).click();
  }

  await page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", { name: "Başvurular" }).click();
  await expect(page).toHaveURL(/\/dealer\/applications$/);
  await expect(page.getByRole("heading", { name: "Başvurular" })).toBeVisible();

  await page.getByPlaceholder("Kayıtlarda ara").fill("Renault");
  await page.getByRole("button", { name: "Uygula" }).click();
  await expect(page).toHaveURL(/q=Renault/);
  await expect(page.locator(".ops-layout")).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedResponses).toEqual([]);
});

test("admin login and primary sidebar routes remain available", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile-chromium";
  await page.goto("/login");
  await page.getByLabel("E-posta").fill(mobile ? "admin.mobile.e2e@otokopru.local" : "admin.e2e@otokopru.local");
  await page.getByLabel("Şifre").fill(mobile ? "AdminMobileE2e123!" : "AdminE2e123!");
  await page.getByRole("button", { name: "Giriş yap" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await openMobileNavigationIfNeeded(page);
  await page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", { name: "Galeriler" }).click();
  await expect(page).toHaveURL(/\/admin\/galleries$/);
  await expect(page.getByRole("heading", { name: "Galeriler" })).toBeVisible();
  await openMobileNavigationIfNeeded(page);
  await page.getByRole("navigation", { name: "Ana menü" }).getByRole("link", { name: "Kullanıcılar" }).click();
  await expect(page).toHaveURL(/\/admin\/users$/);
  await expect(page.getByRole("heading", { name: "Kullanıcılar" })).toBeVisible();
});
