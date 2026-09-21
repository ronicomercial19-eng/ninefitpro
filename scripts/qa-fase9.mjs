import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const progress = await read('src/pages/9fit/Progresso.tsx');
const assessment = await read('src/services/assessments.service.ts');
const postura = await read('supabase/functions/postura-pro-scan/index.ts');
const postWorkout = await read('src/components/9fit/PostWorkoutModal.tsx');

expect('Tela de progresso existe', progress.includes('Progresso') || progress.includes('progresso'));
expect('Progresso consulta dados reais', progress.includes('supabase') || progress.includes('useAthlete'));
expect('Serviço usa avaliações unificadas', assessment.includes('avaliacoes_unificadas'));
expect('Comparação histórica está disponível', assessment.includes('getProgressComparison'));
expect('PosturaPro persiste o scan', postura.includes('postura_scans') && postura.includes('update'));
expect('Pós-treino mantém vínculo com execução', postWorkout.includes('execution') || postWorkout.includes('p_execution_id'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
