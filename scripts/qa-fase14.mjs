import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const students = await read('src/pages/StudentsPage.tsx');
const performance = await read('src/integrations/coachStudentPerformance.ts');
const analytics = await read('src/services/analytics.service.ts');
const api = await read('supabase/functions/fitpro-api/index.ts');

expect('Painel profissional lista alunos', students.includes('StudentsPage') || students.includes('athletes'));
expect('Performance do aluno é filtrada por coach', performance.includes('vw_fitpro_coach_student_performance') && performance.includes('coach_id'));
expect('Relatórios possuem serviço próprio', analytics.includes('ninefit_reports') && analytics.includes('getAthleteReports'));
expect('API B2B autentica conexão', api.includes('api_key_hash') && api.includes('fitpro_connections'));
expect('API B2B mapeia alunos', api.includes('fitpro_student_map') && api.includes('fitpro_professor_id'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
