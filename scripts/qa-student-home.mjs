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
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Como você está hoje?" }).waitFor();
    assert.equal(
      await page.getByRole("link", { name: /Meu treino/ }).getAttribute("href"),
      "/9fit/train"
    );
    await page.getByRole("button", { name: "Responder check-in" }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /Alimentação e água/ }).click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await page.screenshot({
      path: "output/inicio-" + width + ".png",
      fullPage: true,
    });
    console.log("PASS Inicio " + width);
  }
  await page.evaluate(() =>
    window.qaContext({
      calibration: { complete: true },
      today: {
        workout_completed: false,
        workout_in_progress: true,
        rest_day: false,
        meals: 1,
        water_ml: 750,
        review: null,
      },
    })
  );
  await page.getByRole("button", { name: "Retomar treino" }).waitFor();
  console.log("PASS current context changes primary action");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
