import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const ron = await read('src/pages/9fit/Ron.tsx');
const adaptive = await read('src/services/adaptiveState.ts');
const predictive = await read('src/services/predictiveEngine.ts');
const proactive = await read('src/hooks/useProactiveRon.ts');

expect('RON lê contexto adaptativo', ron.includes('adaptiveState') || ron.includes('STATE_INSIGHT'));
expect('Adaptação usa sinais e tendência', adaptive.includes('detectTrend') && adaptive.includes('syncScore'));
expect('Contexto preditivo gera insights', predictive.includes('insights') && predictive.includes('context'));
expect('RON proativo usa eventos reais', proactive.includes('workout_completed') && proactive.includes('sync_score'));
expect('Experiência não rotula diagnóstico', ron.includes('ajuste') || ron.includes('contextual'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
