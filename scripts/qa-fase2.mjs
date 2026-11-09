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
  "src/pages/9fit/Compartilhar.tsx",
  "src/components/9fit/AchievementShareSheet.tsx",
  "src/hooks/useShareEvent.ts",
  "src/services/share.service.ts",
];

const missing = required.filter((file) => !existsSync(resolve(root, file)));
if (missing.length > 0) {
  console.error("Arquivos obrigatórios ausentes:", missing.join(", "));
  process.exit(1);
}

const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");
const progresso = readFileSync(resolve(root, "src/pages/9fit/Progresso.tsx"), "utf8");
const assessmentPage = readFileSync(resolve(root, "src/pages/9fit/AssessmentPages.tsx"), "utf8");
const assessmentWorkspace = readFileSync(resolve(root, "src/components/progress/AssessmentWorkspace.tsx"), "utf8");
const assessmentService = readFileSync(resolve(root, "src/services/assessmentHubService.ts"), "utf8");
const workout = readFileSync(resolve(root, "src/components/9fit/WorkoutExecution.tsx"), "utf8");
const postWorkout = readFileSync(resolve(root, "src/components/9fit/PostWorkoutModal.tsx"), "utf8");
const sharePage = readFileSync(resolve(root, "src/pages/9fit/Compartilhar.tsx"), "utf8");
const shareSheet = readFileSync(resolve(root, "src/components/9fit/AchievementShareSheet.tsx"), "utf8");
const shareHook = readFileSync(resolve(root, "src/hooks/useShareEvent.ts"), "utf8");
const shareService = readFileSync(resolve(root, "src/services/share.service.ts"), "utf8");

const checks = [
  ["Error Boundary global", app.includes("AppErrorBoundary")],
  ["Rota de treino", app.includes('path="/9fit/train"')],
  ["Rota de progresso", app.includes('path="/9fit/progresso"')],
  ["Execução canônica", workout.includes("fn_start_workout_execution") || workout.includes("fn_start_daily_workout_execution")],
  ["Reidratação por execução", workout.includes("execution_id") && workout.includes("executionAttempt")],
  ["Conclusão persistida", workout.includes("fn_complete_workout_execution")],
  ["Pós-treino conectado", workout.includes("PostWorkoutModal") && workout.includes("p_execution_id")],
  ["Progresso via RPC real", progresso.includes("AssessmentPages") && assessmentPage.includes("AssessmentWorkspace") && assessmentWorkspace.includes("loadAssessmentHub") && assessmentService.includes("fn_get_assessment_hub") && assessmentService.includes("p_athlete_id: athleteId")],
  ["Retry do progresso", assessmentWorkspace.includes("Tentar novamente") && assessmentWorkspace.includes("onClick={refresh}")],
  ["Feedback pós-treino", postWorkout.includes("fn_submit_workout_feedback") && postWorkout.includes("p_execution_id:executionId") && postWorkout.includes("!result?.saved")],
  ["Rota de compartilhamento", app.includes('path="/9fit/compartilhar"') && sharePage.includes("AchievementShareSheet")],
  ["Compartilhamento conectado", shareSheet.includes("useShareEvent") && shareSheet.includes("await share(ref.current") && shareHook.includes("await navAny.share(") && shareHook.includes("a.download = file.name")],
  ["Registro de compartilhamento", shareHook.includes("await recordShareEvent(") && shareService.includes("from('share_events').insert(")],
];

const failed = checks.filter(([, ok]) => !ok);
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
if (failed.length > 0) process.exit(1);
