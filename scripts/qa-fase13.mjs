import { readFile } from 'node:fs/promises';

const checks = [];
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) });
const read = (path) => readFile(path, 'utf8');

const checkout = await read('src/pages/9fit/Checkout.tsx');
const success = await read('src/pages/9fit/CheckoutSuccess.tsx');
const prime = await read('src/integrations/primeSystem.ts');
const connector = await read('src/services/connectors/apiConnector.ts');
const monetization = await read('src/services/monetization.ts');

expect('Checkout lê ofertas configuradas', checkout.includes('monetization_offers'));
expect('Checkout valida origem de mensagens', checkout.includes('event.origin') && checkout.includes('payment_succeeded'));
expect('Sucesso verifica assinatura ativa', success.includes('user_subscriptions') && success.includes('status'));
expect('Entitlement possui estados explícitos', prime.includes('active') && prime.includes('trial') && prime.includes('expired'));
expect('Conectores usam proxy central', connector.includes('api-connector-proxy'));
expect('Eventos de monetização são registrados', monetization.includes('monetization_events') && monetization.includes('insert'));

for (const check of checks) console.log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}`);
if (checks.some((check) => !check.pass)) process.exit(1);
