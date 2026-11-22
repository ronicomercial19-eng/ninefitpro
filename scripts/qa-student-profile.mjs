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
  await page.route("https://fonts.googleapis.com/**", r=>r.abort());
  await page.route("https://fonts.gstatic.com/**", r=>r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", (r) => {
    const url = new URL(r.request().url());
    const table = url.pathname.split("/").at(-1);
    const body =
      table === "athletes"
        ? { age: 32, height_cm: 168, avatar_url: null }
        : table === "athlete_weight_history"
        ? { source: "perfil", created_at: "2026-11-21T12:00:00Z" }
        : [];
    return r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=profile", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("heading", { name: "O plano começa por você." })
      .waitFor();
    await page.getByText("32 anos", { exact: true }).waitFor();
    await page.getByRole("button", { name: /Revisar minha ficha/ }).click();
    await page.getByRole("dialog").waitFor();
    await page
      .getByRole("heading", { name: "Minha ficha dinâmica · PDI" })
      .waitFor();
    await page.keyboard.press("Escape");
    await page
      .getByText("Pontos e participação no app", { exact: true })
      .click();
    await page.getByText("SYNC: 72/100.", { exact: false }).waitFor();
    assert.equal(
      await page
        .getByRole("link", { name: /Pagamento e plano/ })
        .getAttribute("href"),
      "/9fit/planos"
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    assert.equal(await page.getByText("Diamante", { exact: true }).count(), 0);
    await page.screenshot({
      path: "output/perfil-" + width + ".png",
      fullPage: true,
    });
    console.log("PASS Perfil " + width);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
