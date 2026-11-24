import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const browser = await chromium.launch({ headless: true, channel: "chrome" });
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  for (const width of (process.env.HOLO_TOUCH_ONLY ? [390] : [320, 390, 768, 1440])) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=modules",
      { waitUntil: "domcontentloaded" }
    );
    const explorer = page.getByRole("region", {
      name: "Explorador de módulos",
    });
    await explorer
      .getByRole("heading", { name: "Staff", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Próximo módulo", exact: true })
      .click();
    await explorer
      .getByRole("heading", { name: "SmartTreino", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Próximo módulo", exact: true })
      .press("ArrowLeft");
    await explorer
      .getByRole("heading", { name: "Staff", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Pausar efeito", exact: true })
      .click();
    assert.equal(
      await page
        .locator(".holo-orbit-one")
        .evaluate((e) => getComputedStyle(e).animationPlayState),
      "paused"
    );
    assert.equal(
      await page
        .locator(".holo-core")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none"
    );
    await page
      .getByRole("navigation", { name: "Escolher módulo" })
      .getByRole("button", { name: "RON", exact: true })
      .click();
    await explorer.getByRole("heading", { name: "RON", exact: true }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await page.screenshot({
      path: `output/modules-holo-${width}.png`,
      fullPage: true,
    });
    console.log(
      "PASS hologram navigation, keyboard, pause, reduced motion and width " +
        width
    );
  }
  await page
    .getByRole("navigation", { name: "Escolher módulo" })
    .getByRole("button", { name: "Staff", exact: true })
    .click();
  await page.getByRole("button", { name: "Abrir Staff", exact: true }).click();
  assert.equal(new URL(page.url()).pathname, "/9fit/staff/fluxo");
  assert.deepEqual(errors, []);
  console.log("PASS official Staff route unchanged; no runtime errors");
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const phone = await mobile.newPage();
  phone.setDefaultTimeout(120000);
  await phone.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await phone.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await phone.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await phone.goto(
    "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=modules",
    { waitUntil: "domcontentloaded" }
  );
  await phone.getByRole("heading", { name: "Staff", exact: true }).waitFor();
  const box = await phone.locator(".holo-projection").boundingBox();
  const cdp = await mobile.newCDPSession(phone);
  const x = box.x + box.width * 0.8,
    y = box.y + box.height * 0.5;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x - 100, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await phone
    .getByRole("heading", { name: "SmartTreino", exact: true })
    .waitFor();
  assert.notEqual(
    await phone
      .locator(".holo-core")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none"
  );
  await phone.getByRole("button", { name: "Pausar efeito", exact: true }).tap();
  await phone.screenshot({path:"output/holo-touch-paused.png",fullPage:true});
  console.log("MOBILE",await phone.locator(".holo-motion-control").textContent());
  await phone.getByRole("button", { name: "Retomar efeito", exact: true }).waitFor();
  assert.equal(
    await phone
      .locator(".holo-orbit-one")
      .evaluate((e) => getComputedStyle(e).animationPlayState),
    "paused"
  );
  console.log("PASS real mobile touch swipe, animated rotation and pause");
  await mobile.close();
} finally {
  await browser.close();
}
