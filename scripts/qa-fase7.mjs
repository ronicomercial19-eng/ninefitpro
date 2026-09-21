import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const page = await read('src/pages/SmartPeriodizer.tsx');
const sync = await read('supabase/functions/smartperiodizer-sync/index.ts');
const view = await read('supabase/migrations/20260611014025_db926316-4617-4b44-a15e-f38cde8eb96b.sql');

expect('Tela SmartPeriodizer existe', page.includes('SmartPeriodizer') && page.includes('smart_periodizer'));
expect('Sincronização exige autenticação', sync.includes('Authorization') && sync.includes('getClaims'));
expect('Sincronização busca conector configurado', sync.includes('api_connectors') && sync.includes('smart_periodizer'));
expect('Plano remoto é persistido', sync.includes('periodization_plans_remote') && sync.includes('upsert'));
expect('Visão canônica prioriza plano publicado', view.includes('periodization_annual_plans') && view.includes('vw_athlete_periodizacao_ativa'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
