import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const required = [
  "src/App.tsx",
  "src/main.tsx",
  "src/integrations/supabase/client.ts",
  "src/components/system/AppErrorBoundary.tsx",
  "src/components/9fit/WorkoutExecution.tsx",
  "src/pages/9fit/Progresso.tsx",
  "src/components/9fit/PostWorkoutModal.tsx",
  "src/components/ShareButton.tsx",
  "src/pages/Support.tsx",
  "src/pages/9fit/Aulas.tsx",
  "src/pages/9fit/HealthFlix.tsx",
  "src/pages/9fit/Checkout.tsx",
  "src/pages/9fit/PosturaPro.tsx",
];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
  console.error("Arquivos obrigatórios ausentes:", missing.join(", "));
  process.exit(1);
}

const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const progresso = readFileSync(resolve(root, "src/pages/9fit/Progresso.tsx"), "utf8");
const workout = readFileSync(resolve(root, "src/components/9fit/WorkoutExecution.tsx"), "utf8");
const postWorkout = readFileSync(resolve(root, "src/components/9fit/PostWorkoutModal.tsx"), "utf8");
const share = readFileSync(resolve(root, "src/components/ShareButton.tsx"), "utf8");
const support = readFileSync(resolve(root, "src/pages/Support.tsx"), "utf8");
const aulas = readFileSync(resolve(root, "src/pages/9fit/Aulas.tsx"), "utf8");
const healthflix = readFileSync(resolve(root, "src/pages/9fit/HealthFlix.tsx"), "utf8");
const checkout = readFileSync(resolve(root, "src/pages/9fit/Checkout.tsx"), "utf8");
const postura = readFileSync(resolve(root, "src/pages/9fit/PosturaPro.tsx"), "utf8");

const checks = [
  ["Error Boundary global", app.includes("AppErrorBoundary")],
  ["Rota de treino", app.includes('path="/9fit/train"')],
  ["Rota de progresso", app.includes('path="/9fit/progresso"')],
  ["Execução canônica", workout.includes("fn_start_workout_execution") || workout.includes("fn_start_daily_workout_execution")],
  ["Reidratação por execução", workout.includes("execution_id") && workout.includes("executionAttempt")],
  ["Conclusão persistida", workout.includes("fn_complete_workout_execution")],
  ["Pós-treino conectado", workout.includes("PostWorkoutModal") && workout.includes("p_execution_id")],
  ["Progresso via RPC real", progresso.includes("fn_get_ron_progresso_screen")],
  ["Retry do progresso", progresso.includes("Tentar novamente")],
  ["Feedback pós-treino", postWorkout.includes("avg_rpe") && postWorkout.includes("workout_progress")],
  ["Compartilhamento", share.includes("share_events") && share.includes("navigator.share")],
  ["Ticket persistido", support.includes("support_tickets")],
  ["Aulas futuras", aulas.includes("class_datetime") && aulas.includes("Só é possível agendar aulas futuras")],
  ["Player HealthFlix", healthflix.includes("<iframe") && healthflix.includes("video_url")],
  ["Checkout seguro", checkout.includes('startsWith("https://")')],
  ["Limpeza de upload órfão", postura.includes("storage.from(\"assessments\").remove")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failed.length > 0) process.exit(1);
