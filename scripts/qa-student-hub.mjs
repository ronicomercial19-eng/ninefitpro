import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  "./qa-db/node_modules/playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
    await page.setViewportSize({ width, height: 960 });
    await page.goto(
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=hub",
      { waitUntil: "domcontentloaded" }
    );
    await page
      .getByRole("heading", { name: "O que aconteceu no seu dia?" })
      .waitFor();
    const disclosure = page.getByRole("button", {
      name: /Ver gráficos da rotina/,
    });
    assert.equal(await disclosure.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator(".hub-rhythm-plot svg").count(), 0);
    await disclosure.click();
    await page.getByRole("article", { name: "Água", exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Como esse número é formado" })
      .click();
    assert.equal(await page.evaluate(() => window.qaDiagnosis), true);
    await page.getByRole("button", { name: /Cobertura dos registros/ }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    assert.equal(
      await page
        .getByRole("link", { name: /Staff · profissionais/ })
        .getAttribute("href"),
      "/9fit/staff/fluxo"
    );
    await page
      .getByRole("button", { name: /Recolher gráficos da rotina/ })
      .click();
    assert.equal(await page.locator(".hub-rhythm-plot svg").count(), 0);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({
      path: "output/hub-experience-" + width + ".png",
      fullPage: true,
    });
    console.log("PASS Hub " + width);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
