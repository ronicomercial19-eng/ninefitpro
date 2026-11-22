import { createServer } from "vite";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  "./qa-db/node_modules/playwright");
await mkdir("output", { recursive: true });
const server = await createServer({
  configFile: false,
  cacheDir: "output/core-workday-cache",
  optimizeDeps: { entries: ["scripts/fixtures/core-workday/index.html"] },
  plugins: [(await import("@vitejs/plugin-react-swc")).default()],
  resolve: {
    alias: [
      {
        find: "@/contexts/AuthContext",
        replacement: path.resolve("scripts/fixtures/core-workday/auth.ts"),
      },
      { find: "@", replacement: path.resolve("src") },
    ],
  },
  server: { host: "127.0.0.1", port: 4198, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const rows = Array.from({ length: 11 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  name:
    i === 0
      ? "João Silva"
      : i === 1
      ? "Maria Santos"
      : `Aluno ${String(i + 1).padStart(2, "0")}`,
  active: i !== 10,
  goal: "performance",
  completed_workouts: i === 0 ? 0 : 2,
  prescribed_sessions: 4,
  avg_rpe: i === 0 ? null : 6,
  duration_minutes: i === 0 ? 0 : 70,
  assignments:
    i % 4 === 0
      ? []
      : [
          {
            student_id: `00000000-0000-4000-8000-${String(i + 1).padStart(
              12,
              "0"
            )}`,
            end_date:
              i % 4 === 1 ? "2026-12-20" : i % 4 === 2 ? null : "2026-11-01",
            is_active: true,
          },
        ],
}));
try {
  const page = await browser.newPage({ reducedMotion: "reduce" });
  page.setDefaultTimeout(90000);
  page.setDefaultNavigationTimeout(90000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-11-22T15:00:00Z") });
  let mode = "ready";
  await page.route("https://fonts.googleapis.com/**", (r) => r.abort());
  await page.route("https://fonts.gstatic.com/**", (r) => r.abort());
  await page.route(
    "https://mfrydtrzjxscbkaiwfnw.supabase.co/**",
    async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      const rpc = url.pathname.split("/").at(-1);
      const body = req.method() === "POST" ? req.postDataJSON() : {};
      let data = [];
      if (mode === "error" && rpc === "fn_coach_overview")
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ message: "QA overview unavailable" }),
        });
      const students = mode === "empty" ? [] : rows;
      if (rpc === "fn_coach_students_page")
        data = {
          students,
          total: students.length,
          selected: students.find((r) => r.id === body.p_selected_id) || null,
        };
      if (rpc === "fn_coach_overview")
        data = {
          start: body.p_start,
          end: body.p_end,
          generated_at: "2026-11-22T15:00:00Z",
          students: students.map((r) => ({
            ...r,
            completed_workouts:
              body.p_start === "2026-11-16"
                ? Math.min(1, r.completed_workouts)
                : r.completed_workouts,
          })),
        };
      if (rpc === "fn_coach_readiness_alerts")
        data = {
          total: mode === "empty" ? 0 : 1,
          items:
            mode === "empty"
              ? []
              : [
                  {
                    id: "alert-1",
                    athlete_id: rows[0].id,
                    name: rows[0].name,
                    gate_level: 1,
                    flags: ["persistent_pain_review"],
                    status: "skipped_review",
                  },
                ],
        };
      if (rpc === "fn_coach_training_setup_queue")
        data = {
          total: mode === "empty" ? 0 : 1,
          items:
            mode === "empty"
              ? []
              : [
                  {
                    id: rows[0].id,
                    name: rows[0].name,
                    has_periodization: false,
                    has_manual_assignment: true,
                    latest_workout: null,
                  },
                ],
        };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    }
  );
  const open = () =>
    page.goto(
      "http://127.0.0.1:4198/scripts/fixtures/core-workday/index.html",
      { waitUntil: "domcontentloaded" }
    );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await open();
    await page
      .getByRole("heading", { name: "Seu dia de acompanhamento." })
      .waitFor();
    await page
      .getByRole("link", { name: "Revisar sinais de João Silva" })
      .waitFor();
    assert.equal(
      await page
        .getByRole("link", { name: "Revisar sinais de João Silva" })
        .getAttribute("href"),
      "/app/acompanhamento?athlete=" + rows[0].id
    );
    await page
      .getByRole("button", { name: "Sem sessão registrada", exact: true })
      .click();
    await page.getByText("1 aluno neste filtro", { exact: false }).waitFor();
    assert.equal(await page.locator(".core-workday-roster article").count(), 1);
    await page.getByRole("button", { name: "Todos", exact: true }).click();
    await page
      .getByRole("searchbox", { name: "Buscar nos indicadores da carteira" })
      .fill("joao");
    assert.equal(await page.locator(".core-workday-roster article").count(), 1);
    await page
      .getByRole("searchbox", { name: "Buscar nos indicadores da carteira" })
      .fill("");
    assert.equal(
      await page.locator(".core-workday-roster article").count(),
      width < 768 ? 4 : 8
    );
    const pagination = page.getByRole("navigation", {
      name: "Paginação dos alunos",
    });
    await pagination.getByRole("button", { name: "Próxima" }).click();
    assert.equal(
      await page.locator(".core-workday-roster article").count(),
      width < 768 ? 4 : 3
    );
    await pagination.getByRole("button", { name: "Anterior" }).click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    );
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({
      path: `output/core-workday-${width}.png`,
      fullPage: true,
    });
    console.log("PASS Core dashboard " + width);
  }
  await page.getByLabel("Período dos indicadores").selectOption("7");
  await page.getByText("16/11/2026 a 22/11/2026", { exact: false }).waitFor();
  const selector = page.getByLabel("Contexto do acompanhamento", {
    exact: true,
  });
  await selector.selectOption(rows[1].id);
  await page
    .getByRole("heading", { name: "Acompanhamento de Maria Santos" })
    .waitFor();
  assert.equal(await page.locator(".core-workday-roster article").count(), 1);
  await page
    .getByRole("link", { name: "Revisar sinais de João Silva" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Abrir acompanhamento", exact: true })
      .getAttribute("href"),
    "/app/acompanhamento?athlete=" + rows[1].id
  );
  console.log(
    "PASS period refresh, selected student context and explicitly global review queues"
  );
  await selector.selectOption("");
  mode = "error";
  await open();
  await page
    .getByRole("alert")
    .filter({ hasText: "Não foi possível confirmar os indicadores" })
    .waitFor();
  assert.equal(
    await page
      .locator(".core-workday-metrics strong")
      .filter({ hasText: "—" })
      .count(),
    3
  );
  await page
    .getByRole("link", { name: "Revisar sinais de João Silva" })
    .waitFor();
  console.log(
    "PASS overview failure does not fabricate zeros or hide independent review queue"
  );
  mode = "empty";
  await open();
  await page
    .getByRole("heading", { name: "Sua carteira começa pelo primeiro aluno." })
    .waitFor();
  await page
    .getByText("Nenhuma revisão nesta consulta.", { exact: false })
    .waitFor();
  await page.screenshot({
    path: "output/core-workday-empty.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS confirmed empty states, scoped navigation, no runtime errors and no real writes"
  );
} finally {
  await browser.close();
  await server.close();
}
