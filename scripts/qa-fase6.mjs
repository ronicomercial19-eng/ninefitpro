import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const page = await read('src/pages/SmartTreinoPage.tsx');
const service = await read('src/services/training.service.ts');
const students = await read('src/pages/StudentsPage.tsx');

expect('Cockpit SmartTreino existe', page.includes('SmartTreino') && page.includes('TrainingAdjustmentsPage'));
expect('Serviço lê atribuições ativas', service.includes("from('student_training_assignments')") && service.includes("eq('is_active', true)"));
expect('Serviço cria atribuição profissional', service.includes('createAssignment') && service.includes('.insert(assignment)'));
expect('Serviço atualiza atribuição', service.includes('updateAssignment') && service.includes('.update('));
expect('Painel de alunos é o destino da entrega', page.includes("'/app/alunos'") && students.length > 0);

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
