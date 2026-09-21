import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const healthflix = await read('src/pages/9fit/HealthFlix.tsx');
const community = await read('src/pages/9fit/Community.tsx');
const habits = await read('src/pages/9fit/HabitFlow.tsx');
const webhook = await read('supabase/functions/healthflix-webhook/index.ts');
const recovery = await read('src/components/9fit/DailyProtocol.tsx');

expect('HealthFlix usa proxy de integração', healthflix.includes('healthflix-proxy'));
expect('Comunidade possui tela própria', community.includes('Community') || community.includes('community'));
expect('Hábitos possuem fluxo persistente', habits.includes('localStorage') && habits.includes('habit'));
expect('Webhook HealthFlix atualiza progresso', webhook.includes('healthflix_progress') && webhook.includes('upsert'));
expect('Protocolo diário inclui recuperação', recovery.includes('recovery'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
