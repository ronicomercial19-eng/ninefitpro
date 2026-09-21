import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const train = await read('src/pages/9fit/Train.tsx');
const execution = await read('src/components/9fit/WorkoutExecution.tsx');
const overview = await read('src/components/9fit/WorkoutOverview.tsx');

expect('Loop Hoje carrega atribuições ativas', train.includes('student_training_assignments') && train.includes('is_active'));
expect('Loop Semana entrega exercícios do dia', train.includes('handleExecuteWeekDay') && train.includes('day?.exercises'));
expect('Loop Protocolo aceita conteúdo estruturado', train.includes('training_type === "structured"') && train.includes('training_data'));
expect('Loops convergem para execução canônica', train.includes('<WorkoutExecution') && train.includes('selectedTraining'));
expect('Visão geral precede execução manual', train.includes('setFlow("OVERVIEW")') && overview.length > 0);
expect('Execução persiste o estado canônico', execution.includes('workout_executions') && execution.includes('executionStatus'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
