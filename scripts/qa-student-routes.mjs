import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  "./qa-db/node_modules/playwright");
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({
    viewport: { width: 390, height: 960 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(120000);
  page.setDefaultNavigationTimeout(120000);
  await page.route("https://fonts.googleapis.com/**", r=>r.abort());
  await page.route("https://fonts.gstatic.com/**", r=>r.abort());
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
  await page.goto(
    "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=hub-route", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Sua rotina ganha forma." })
    .waitFor();
  await page
    .getByRole("heading", { name: "O que aconteceu no seu dia?" })
    .waitFor();
  await page
    .getByText("Planejamento, serviços e conta", { exact: true })
    .click();
  await page.getByRole("link", { name: /Staff · profissionais/ }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  );
  await page.screenshot({ path: "output/hub-route-390.png", fullPage: true });
  await page.goto(
    "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=train-route", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("heading", { name: "Seu treino", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Hoje", exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Encontrar orientação profissional" })
    .waitFor();
  await page.screenshot({ path: "output/train-route-390.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS actual Hub and Train route composition, empty data, secondary navigation and no runtime errors"
  );
} finally {
  await browser.close();
}
