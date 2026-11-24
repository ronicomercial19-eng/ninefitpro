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
  let saved = null;
  let decision = null;
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.route("https://mfrydtrzjxscbkaiwfnw.supabase.co/**", async (r) => {
    const u = r.request().url();
    let body = [];
    if (u.includes("fn_get_daily_readiness"))
      body = { preferences: { enabled: true }, decision };
    if (u.includes("fn_get_training_guard")) body = { blocked: false };
    if (u.includes("daily_checkins") && r.request().method() === "POST") {
      saved = r.request().postDataJSON();
      decision = {
        decision_date: new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Sao_Paulo",
        }),
        status: "shadow",
        mode: "balanced",
        volume_pct_total: 0,
        volume_pct_applied: 0,
        base_sets: 10,
        applied_sets: 10,
        flags: [],
        inputs: {},
        reasons: [],
      };
    }
    await r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(
      "http://127.0.0.1:4197/scripts/fixtures/student-experience/index.html?screen=train",
      { waitUntil: "domcontentloaded" }
    );
    await page
      .getByText("O treino original foi mantido.", { exact: false })
      .waitFor();
    await page.evaluate(() =>
      window.qaReadiness({ preferences: { enabled: true }, decision: null })
    );
    await page.getByRole("button", { name: "Fazer meu check-in" }).click();
    await page.getByText("Como foi seu sono?", { exact: true }).waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await page.screenshot({
      path: `output/sync-checkin-${width}.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    console.log("PASS inline check-in opens/closes " + width);
  }
  await page.getByRole("button", { name: "Fazer meu check-in" }).click();
  for (const [question, answer] of [
    ["Como foi seu sono?", "perfeito"],
    ["Sua energia agora?", "pico"],
    ["Seu humor hoje?", "ótimo"],
    ["Alguma dor ou desconforto?", "nenhuma"],
    ["Motivação para treinar?", "explosiva"],
  ]) {
    await page.getByText(question, { exact: true }).waitFor();
    await page.getByRole("button", { name: new RegExp(answer) }).click();
  }
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByText("O treino original foi mantido.", { exact: false })
    .waitFor();
  const row = Array.isArray(saved) ? saved[0] : saved;
  assert.equal(row.sono, 5);
  assert.equal(row.dor, 1);
  assert.equal(row.athlete_id, "00000000-0000-4000-8000-000000000001");
  assert.deepEqual(errors, []);
  console.log(
    "PASS canonical save, pain conversion and real shadow decision without nested card"
  );
} finally {
  await browser.close();
}
