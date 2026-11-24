import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let saved = false;
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", (r) => {
    let body = "[]";
    if (
      r.request().method() === "POST" &&
      r.request().url().includes("nutrition_logs")
    ) {
      saved = true;
      body = JSON.stringify({ id: "qa-meal", ...r.request().postDataJSON() });
    }
    return r.fulfill({ status: 200, contentType: "application/json", body });
  });
  await page.goto(
    "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=hub",
    { waitUntil: "domcontentloaded" }
  );
  await page.getByRole("img", { name: "Índice Sync: 72 de 100" }).waitFor();
  const cdp = await context.newCDPSession(page);
  for (const width of [390, 844, 320, 768, 1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      ),
      "fluid document after resize " + width
    );
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    await page.waitForFunction(() => visualViewport.scale > 1.5);
    await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
    await page.waitForFunction(() => Math.abs(visualViewport.scale - 1) < 0.01);
    assert.ok(
      await page.evaluate(() => Math.abs(visualViewport.width - innerWidth) < 2)
    );
    console.log("PASS zoom in/out and viewport resize " + width);
  }
  await page
    .getByRole("button", { name: "Sua alimentação hoje", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar refeição", exact: true })
    .click();
  const dialog = page.locator("[data-app-dialog]");
  await dialog.waitFor();
  for (const input of await dialog.locator("input").all())
    assert.ok(
      await input.evaluate(
        (e) => parseFloat(getComputedStyle(e).fontSize) >= 16
      ),
      "prevent focus autozoom"
    );
  await dialog.getByPlaceholder("Ex: Almoço").fill("Refeição de teste");
  await page.setViewportSize({ width: 390, height: 430 });
  await page.waitForFunction(
    () =>
      Math.abs(
        parseFloat(
          document.documentElement.style.getPropertyValue(
            "--app-visible-height"
          )
        ) - visualViewport.height
      ) < 2
  );
  const bounds = await dialog.boundingBox();
  await page.screenshot({
    path: "output/viewport-keyboard.png",
    fullPage: true,
  });
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
  assert.ok(
    bounds.y >= 0 && bounds.y + bounds.height <= 431,
    "dialog fits reduced visible height"
  );
  await dialog
    .getByRole("button", { name: "Registrar Refeição", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(saved, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 1 });
  await page.waitForFunction(
    () => Math.abs(visualViewport.width - innerWidth) < 2
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  );
  await page.screenshot({
    path: "output/viewport-after-save-390.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS real meal save flow, mobile font sizes, dialog height recovery and original Sync ring"
  );
  await context.close();
} finally {
  await browser.close();
}
