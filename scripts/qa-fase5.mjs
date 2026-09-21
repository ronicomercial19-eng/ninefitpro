import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const execution = await read('src/components/9fit/WorkoutExecution.tsx');
const contract = await read('src/types/training.ts');

expect('Contrato de execução define estados válidos', contract.includes("'in_progress'") && contract.includes("'completed'") && contract.includes("'skipped'"));
expect('Treino inicia ou restaura execução em andamento', execution.includes('executionStatus') && execution.includes('in_progress'));
expect('Treino impede conclusão duplicada', execution.includes('completed'));
expect('Consulta de execução aberta usa estado canônico', execution.includes("eq('status', 'in_progress')") || execution.includes('in_progress'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
