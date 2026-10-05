import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const authContext = await read('src/contexts/AuthContext.tsx');
const authService = await read('src/services/auth.service.ts');
const privateRoute = await read('src/components/auth/PrivateRoute.tsx');
const app = await read('src/App.tsx');
const nineFitLayout = await read('src/components/9fit/NineFitLayout.tsx');

expect('AuthContext consome identidade canônica', authContext.includes("from('vw_current_identity')"));
expect('Serviço de auth resolve papel canônico', authService.includes("from('vw_current_identity')"));
expect('PrivateRoute aceita papéis', privateRoute.includes('allowedRoles'));
expect('Rotas administrativas exigem papel', app.includes('allowedRoles={["admin", "super_admin"]}'));
expect('NineFitLayout usa identidade canônica', /\.from\(['"]vw_current_identity['"](?:\s+as\s+any)?\)/.test(nineFitLayout));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);

