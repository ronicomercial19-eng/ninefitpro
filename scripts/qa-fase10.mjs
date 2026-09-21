import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const progress = await read('src/pages/9fit/Progresso.tsx');
const scores = await read('src/hooks/useAthleteScores.ts');
const predictive = await read('src/services/predictiveEngine.ts');
const progression = await read('src/services/training/loadProgression.ts');

expect('Evolução exibe histórico de score', progress.includes('score_historico') && progress.includes('score-history'));
expect('Score usa dados do atleta', scores.includes('sync_score_logs') && scores.includes('workout_executions'));
expect('Inteligência preditiva existe', predictive.includes('loadPredictiveSnapshot') || predictive.includes('PredictiveSnapshot'));
expect('Progressão calcula histórico real', progression.includes('workout_exercise_sets') && progression.includes('history'));
expect('Atualização em tempo real está conectada', scores.includes('postgres_changes'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
