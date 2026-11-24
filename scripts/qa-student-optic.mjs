import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.setDefaultTimeout(120000);
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: r.request().url().includes("vw_fitpro_diet_context")
        ? "null"
        : "[]",
    })
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=hub-route",
      { waitUntil: "domcontentloaded" }
    );
    await page.getByRole("img", { name: /Índice Sync/ }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await page
      .getByRole("button", { name: "A SEGUIR Registre seu dia", exact: true })
      .click();
    await page.waitForFunction(
      () => document.activeElement?.id === "hub-records"
    );
    assert.ok(
      await page
        .locator("#hub-sync")
        .evaluate((e) => e.getBoundingClientRect().bottom <= 100)
    );
    await page
      .getByRole("button", { name: "A SEGUIR Seu acompanhamento", exact: true })
      .click();
    await page.waitForFunction(
      () => document.activeElement?.id === "hub-support"
    );
    assert.equal(
      await page.getByRole("img", { name: /Índice Sync/ }).count(),
      1
    );
    await page.locator("#hub-sync").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `output/optic-hub-${width}.png`,
      fullPage: true,
    });
    console.log(
      "PASS sequential chapters, next previews, preserved Sync and width " +
        width
    );
  }
  await page.goto(
    "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=train-route",
    { waitUntil: "domcontentloaded" }
  );
  await page
    .getByRole("button", { name: "A SEGUIR Sua sessão", exact: true })
    .click();
  await page.waitForFunction(
    () => document.activeElement?.id === "train-session"
  );
  await page
    .getByRole("button", { name: "A SEGUIR Seu histórico", exact: true })
    .click();
  await page.waitForFunction(
    () => document.activeElement?.id === "train-history"
  );
  console.log("PASS Train preparation/session/history navigation");
} finally {
  await browser.close();
}
