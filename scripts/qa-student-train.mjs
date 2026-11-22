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
  await page.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=train", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Conferir e iniciar sessão" })
      .click();
    assert.equal(await page.evaluate(() => window.qaSelected), true);
    await page
      .getByText("O treino original foi mantido.", { exact: false })
      .waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await page.screenshot({
      path: "output/train-" + width + ".png",
      fullPage: true,
    });
    console.log("PASS Train " + width);
  }
  await page.evaluate(() => window.qaTrain("template"));
  await page.getByRole("button", { name: "Consultar meu protocolo" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Conferir e iniciar sessão" })
      .count(),
    0
  );
  await page.evaluate(() => window.qaTrain("empty"));
  await page
    .getByRole("button", { name: "Encontrar orientação profissional" })
    .waitFor();
  await page.getByText("Precisa de outra forma de treinar?").click();
  await page.getByRole("button", { name: /Tenho pouco tempo/ }).click();
  assert.equal(await page.evaluate(() => window.qaQuick), true);
  assert.deepEqual(errors, []);
  console.log("PASS template cannot start, empty state and quick alternative");
} finally {
  await browser.close();
}
