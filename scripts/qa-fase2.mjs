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
];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
  console.error("Arquivos obrigatórios ausentes:", missing.join(", "));
  process.exit(1);
}

const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const progresso = readFileSync(resolve(root, "src/pages/9fit/Progresso.tsx"), "utf8");
const workout = readFileSync(resolve(root, "src/components/9fit/WorkoutExecution.tsx"), "utf8");

const checks = [
  ["Error Boundary global", app.includes("AppErrorBoundary")],
  ["Rota de treino", app.includes('path="/9fit/train"')],
  ["Rota de progresso", app.includes('path="/9fit/progresso"')],
  ["Execução canônica", workout.includes("fn_start_workout_execution") || workout.includes("fn_start_daily_workout_execution")],
  ["Progresso via RPC real", progresso.includes("fn_get_ron_progresso_screen")],
  ["Retry do progresso", progresso.includes("Tentar novamente")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failed.length > 0) process.exit(1);
