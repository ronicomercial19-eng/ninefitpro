import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url),
  { chromium } = require("./qa-db/node_modules/playwright");
const output = process.env.QA_OUTPUT_DIR || "../output/qa-professor";
const base = process.env.QA_BASE_URL || "http://127.0.0.1:4173";
const coach = "00000000-0000-4000-8000-000000000001",
  student = "00000000-0000-4000-8000-000000000002";
const a = "10000000-0000-4000-8000-000000000001",
  b = "10000000-0000-4000-8000-000000000002",
  exercise = "20000000-0000-4000-8000-000000000001";
const students = [
  {
    id: a,
    name: "Aluno A",
    user_id: student,
    goal: "Consistência",
    active: true,
  },
  { id: b, name: "Aluno B", user_id: null, goal: "Força", active: true },
];
const daily = {
  version: 3,
  status: "available",
  date: "2026-10-23",
  generated_at: new Date().toISOString(),
  profile: {
    complete: true,
    declared: { goal: "Consistência" },
    preferences: {},
    inferred: {},
    observed: {
      active_days_30d: 1,
      completed_workouts_30d: 0,
      nutrition_days_30d: 0,
      hydration_days_30d: 0,
      review_days_30d: 0,
      training_windows: [],
    },
  },
  calibration: {
    complete: false,
    sleep: null,
    energy: null,
    mood: null,
    motivation: null,
    pain: null,
  },
  safety: { review_required: false },
  today: {
    workout_completed: false,
    workout_in_progress: false,
    workout_scheduled: false,
    rest_day: false,
    meals: 0,
    water_ml: 0,
    review: null,
  },
  streak: 0,
  sync: { value: null, coverage_dimensions: {} },
};
const browser = await chromium.launch({ headless: true });
let checks = 0;
const apiCalls = [],
  messages = [],
  aiHistory = [];
let failMessage = true;
const pageErrors = [];
async function setup(role = "professor") {
  const uid = role === "professor" ? coach : student,
    ctx = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
  const user = {
    id: uid,
    email: "qa@invalid.test",
    role: "authenticated",
    aud: "authenticated",
    is_anonymous: false,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const exp = Math.floor(Date.now() / 1000) + 3600,
    enc = (x) => Buffer.from(JSON.stringify(x)).toString("base64url");
  const token =
    enc({ alg: "HS256", typ: "JWT" }) +
    "." +
    enc({
      sub: uid,
      role: "authenticated",
      aud: "authenticated",
      exp,
      iat: exp - 3600,
      is_anonymous: false,
    }) +
    ".fixture-only";
  await ctx.addInitScript(
    ({ user, token, exp }) => {
      localStorage.setItem(
        "sb-mfrydtrzjxscbkaiwfnw-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture-only",
          expires_at: exp,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
      localStorage.setItem(`9fit:professor:tour:${user.id}`, "true");
    },
    { user, token, exp },
  );
  await ctx.route(
    "https://mfrydtrzjxscbkaiwfnw.supabase.co/**",
    async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        body = req.postDataJSON?.() || {};
      const endpoint = url.pathname.split("/").at(-1);
      apiCalls.push({ endpoint, body, role });
      const respond = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          headers: {
            "access-control-allow-origin": "*",
            "content-range": "0-0/1",
          },
          body: JSON.stringify(data),
        });
      if (url.pathname.includes("/auth/v1/user")) return respond(user);
      if (endpoint === "vw_current_identity")
        return respond({
          user_id: uid,
          email: user.email,
          full_name: role === "professor" ? "Professor QA" : "Aluno QA",
          profile_role: role,
          is_active: true,
          roles: [{ role }],
          athlete_id: role === "student" ? a : null,
          athlete_name: role === "student" ? "Aluno A" : null,
          first_access_completed: true,
        });
      if (endpoint === "fn_coach_students") return respond(students);
      if (endpoint === "fn_coach_student_context") {
        const id = body.p_athlete_id;
        return respond({
          version: 1,
          generated_at: new Date().toISOString(),
          athlete: {
            id,
            name: id === a ? "Aluno A" : "Aluno B",
            goal: "Consistência",
            restrictions: null,
          },
          daily_context: daily,
          workouts: [],
          prescriptions: [],
          assessments: [],
          pain_reports: [],
          activities: [],
          habits: [],
          protocols: [],
          appointments: [],
          nutrition: { meals: 0, days: 0 },
          hydration: { water_ml: 0, days: 0 },
        });
      }
      if (endpoint === "fn_coach_overview")
        return respond({
          start: "2026-09-24",
          end: "2026-10-23",
          generated_at: new Date().toISOString(),
          students: students.map((s) => ({
            ...s,
            completed_workouts: 0,
            prescribed_sessions: 0,
            avg_rpe: null,
            duration_minutes: 0,
            assignments: [],
          })),
        });
      if (endpoint === "fn_get_daily_context") return respond(daily);
      if (endpoint === "fn_current_athlete_id")
        return respond(role === "student" ? a : null);
      if (endpoint === "fn_student_professional")
        return respond({
          athlete_id: a,
          coach_name: "Professor QA",
          available: true,
        });
      if (endpoint === "professional_ai_turns")
        return respond(
          aiHistory.filter(
            (t) =>
              t.athlete_id === url.searchParams.get("athlete_id")?.slice(3),
          ),
        );
      if (endpoint === "fn_save_professional_ai_turn") {
        aiHistory.push({
          athlete_id: body.p_athlete_id,
          question: body.p_question,
          answer: body.p_answer,
          mode: body.p_mode,
          created_at: new Date().toISOString(),
        });
        return respond({ saved: true, id: body.p_request_id });
      }
      if (endpoint === "ai-coach") {
        if (body.message === "RESPOSTA ATRASADA") {
          await new Promise((r) => setTimeout(r, 1200));
          return respond({
            success: true,
            data: {
              content: "RESPOSTA DO ALUNO A NÃO DEVE APARECER",
              actions: [],
            },
          });
        }
        return respond({
          success: true,
          data: {
            content:
              "Contexto confirmado de " +
              (body.athlete_id === a ? "Aluno A" : "Aluno B"),
            actions: [],
          },
        });
      }
      if (endpoint === "student_professional_messages")
        return respond(
          messages.filter(
            (m) =>
              m.athlete_id === url.searchParams.get("athlete_id")?.slice(3),
          ),
        );
      if (endpoint === "fn_send_student_message") {
        if (failMessage) {
          failMessage = false;
          return respond({ message: "Falha simulada de rede" }, 503);
        }
        messages.push({
          id: body.p_request_id,
          athlete_id: body.p_athlete_id,
          sender_user_id: uid,
          sender_role: role === "professor" ? "professional" : "student",
          body: body.p_body,
          created_at: new Date().toISOString(),
        });
        return respond({ saved: true, id: body.p_request_id });
      }
      if (endpoint === "exercises")
        return respond([{ id: exercise, name: "Agachamento QA" }]);
      if (endpoint === "fn_professor_publish_workout")
        return respond({
          saved: true,
          athlete_id: body.p_athlete_id,
          daily_workout_id: "30000000-0000-4000-8000-000000000001",
        });
      if (endpoint === "daily_workouts") return respond(null);
      if (endpoint === "profiles")
        return respond({
          user_id: uid,
          role,
          is_active: true,
          notification_preferences: {},
        });
      if (endpoint === "athlete_activation")
        return respond({ finished_at: new Date().toISOString() });
      if (endpoint === "user_context_settings")
        return respond({ pdi_completed_at: new Date().toISOString() });
      if (endpoint === "athletes")
        return respond(
          role === "student"
            ? {
                id: a,
                user_id: student,
                name: "Aluno A",
                activated: true,
                password_changed: true,
              }
            : [],
        );
      return respond([]);
    },
  );
  const page = await ctx.newPage();
  page.setDefaultTimeout(60000);
  page.on("pageerror", (e) => pageErrors.push(e.message));
  return { ctx, page };
}
try {
  const { page, ctx } = await setup();
  await page.goto(`${base}/app/acompanhamento?athlete=${a}`);
  await page
    .getByRole("heading", { name: "Acompanhamento · Aluno A", exact: true })
    .waitFor();
  checks++;
  console.log("PASS selected student context renders");
  await page.getByRole("link", { name: "RON", exact: true }).click();
  await page
    .getByRole("heading", { name: "RON · Professor", exact: true })
    .waitFor();
  assert.ok(page.url().includes("athlete=" + a));
  checks++;
  console.log("PASS sidebar preserves selected student");
  await page
    .getByRole("textbox", { name: "Pergunta sobre o aluno" })
    .fill("RESPOSTA ATRASADA");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await page.getByLabel("Aluno em acompanhamento").selectOption(b);
  await page.getByText(/^Contexto de Aluno B\./).waitFor();
  await page.waitForTimeout(1600);
  assert.equal(
    await page
      .getByText("RESPOSTA DO ALUNO A NÃO DEVE APARECER", { exact: true })
      .count(),
    0,
  );
  checks++;
  console.log("PASS late AI response discarded after student switch");
  await page
    .getByRole("textbox", { name: "Pergunta sobre o aluno" })
    .fill("Como estão os registros?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await page
    .getByText("Contexto confirmado de Aluno B", { exact: true })
    .waitFor();
  assert.equal(
    apiCalls.filter((c) => c.endpoint === "ai-coach").at(-1).body.athlete_id,
    b,
  );
  checks++;
  console.log("PASS AI uses selected student identifier");
  await page.getByRole("link", { name: "Treino com IA", exact: true }).click();
  await page.getByText("+ Agachamento QA", { exact: true }).click();
  const publish = page.getByRole("button", {
    name: "Publicar no app de Aluno B",
    exact: true,
  });
  assert.equal(await publish.isDisabled(), true);
  await page
    .getByLabel(
      "Revisei aluno, data, restrições e parâmetros antes da publicação.",
    )
    .check();
  await publish.click();
  await page
    .getByText("Treino publicado para Aluno B", { exact: true })
    .waitFor();
  assert.equal(
    apiCalls.filter((c) => c.endpoint === "fn_professor_publish_workout").at(-1)
      .body.p_athlete_id,
    b,
  );
  checks++;
  console.log(
    "PASS prescription requires review and publishes selected student",
  );
  await page.getByRole("link", { name: "Mensagens", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Mensagem ao profissional ou aluno" })
    .fill("Mensagem de teste preservada");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await page
    .getByText(
      "Não foi possível confirmar o envio. Seu texto foi preservado para tentar novamente.",
      { exact: true },
    )
    .waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Mensagem ao profissional ou aluno" })
      .inputValue(),
    "Mensagem de teste preservada",
  );
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await page
    .getByText("Mensagem de teste preservada", { exact: true })
    .waitFor();
  const sends = apiCalls.filter(
    (c) => c.endpoint === "fn_send_student_message",
  );
  assert.equal(sends[0].body.p_request_id, sends[1].body.p_request_id);
  checks++;
  console.log("PASS message retry preserves body and receipt");
  await mkdir(output, { recursive: true });
  await page.screenshot({
    path: output + "/conversa-professor.png",
    fullPage: true,
  });
  await ctx.close();
  const studentApp = await setup("student");
  await studentApp.page.goto(`${base}/9fit/mensagens`);
  await studentApp.page
    .getByRole("heading", {
      name: "Meu profissional · Professor QA",
      exact: true,
    })
    .waitFor();
  checks++;
  console.log("PASS student has separate professional conversation");
  await studentApp.page.screenshot({
    path: output + "/conversa-aluno.png",
    fullPage: true,
  });
  await studentApp.page.setViewportSize({ width: 390, height: 844 });
  await studentApp.page.screenshot({
    path: output + "/conversa-aluno-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await studentApp.page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  checks++;
  console.log("PASS student conversation fits mobile width");
  await studentApp.ctx.close();
  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify({
      checks,
      mode: "browser with mocked network",
      productionWrites: 0,
      pageErrors,
    }),
  );
} finally {
  await browser.close();
}
