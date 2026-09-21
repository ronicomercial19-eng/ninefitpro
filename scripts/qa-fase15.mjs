import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const vite = await read('vite.config.ts');
const packageJson = await read('package.json');
const app = await read('src/App.tsx');

expect('Build PWA configurado', vite.includes('VitePWA') || vite.includes('vite-plugin-pwa'));
expect('Comandos de qualidade registrados', packageJson.includes('typecheck') && packageJson.includes('lint'));
expect('Rotas protegidas usam autenticação', app.includes('PrivateRoute'));
expect('Artefato PWA gerado no QA local', existsSync('dist/sw.js'));
expect('Build possui fallback de produção', existsSync('dist/index.html'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
