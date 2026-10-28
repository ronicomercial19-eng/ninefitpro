import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentHandler, paymentReference, verifiedPayment, checkoutUrl } from '../../../supabase/functions/_shared/infinitepay';
import { parsePaymentReturn } from '../paymentReturn';
const owner = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
const orderId = '20000000-0000-4000-8000-000000000001', requestId = '30000000-0000-4000-8000-000000000001';
const reference = { order_nsu: orderId, transaction_nsu: 'transaction-1', invoice_slug: 'invoice-1' };
function fixture() {
  let order: any = { id: orderId, user_id: owner, period: 'basic', amount_cents: 9700, status: 'pending', claimed: true };
  let paid = true, amount = 9700, apiDown = false, currentUser: any = { id: owner }, saves = 0, reviews = 0;
  const calls: any[] = [];
  const db = {
    from: (_name: string) => ({ select: () => ({ eq: (_key: string, id: string) => ({ maybeSingle: async () => ({ data: order?.id === id ? order : null, error: null }) }) }), upsert: async () => { reviews++; return { error: null }; } }),
    rpc: async (name: string, args: any) => {
      calls.push({ name, args });
      if (name === 'fn_prepare_infinitepay_order') return { data: order, error: null };
      if (name === 'fn_attach_infinitepay_link') { order.checkout_url = args.p_url; order.status = 'ready'; return { data: order, error: null }; }
      if (name === 'fn_confirm_infinitepay_order') { saves++; order.status = 'paid'; order.transaction_nsu = args.p_transaction_nsu; order.invoice_slug = args.p_invoice_slug; return { data: { saved: true }, error: null }; }
      throw Error('unexpected RPC');
    },
  };
  const fetcher = async (url: any, options: any) => {
    calls.push({ url, body: JSON.parse(options.body), headers: options.headers });
    if (apiDown) throw Error('offline');
    return new Response(JSON.stringify(String(url).endsWith('/links') ? { url: 'https://checkout.infinitepay.io/ronynapoleao/order-1' } : { success: true, paid, amount, paid_amount: amount }), { status: 200 });
  };
  const deps = { db, fetcher: fetcher as typeof fetch, authenticate: async () => currentUser };
  const invoke = (body: any, webhook = false, auth = true) => createPaymentHandler(deps, webhook)(new Request('https://example.test', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: 'Bearer test' } : {}) }, body: JSON.stringify(body) }));
  return { invoke, calls, order, setUser: (value: any) => { currentUser = value; }, setPaid: (value: boolean) => { paid = value; }, setAmount: (value: number) => { amount = value; }, offline: () => { apiDown = true; }, counts: () => ({ saves, reviews }) };
}
test('checkout binds to authenticated account and server price, ignoring forged identity/amount', async () => {
  const f = fixture();
  const result = await f.invoke({ action: 'create', period: 'basic', request_id: requestId, user_id: other, amount: 1 });
  assert.equal(result.status, 200);
  const prepare = f.calls.find(c => c.name === 'fn_prepare_infinitepay_order');
  assert.equal(prepare.args.p_user_id, owner);
  const provider = f.calls.find(c => c.url?.endsWith('/links'));
  assert.equal(provider.body.order_nsu, orderId); assert.equal(provider.body.items[0].price, 9700);
  assert.equal(provider.body.redirect_url, 'https://ninefitpro.lovable.app/9fit/pagamento/retorno');
  assert.match(provider.body.webhook_url, /supabase\.co\/functions\/v1\/infinitepay-webhook$/);
  assert.equal(provider.body.customer, undefined);
});
test('checkout requires a confirmed non-anonymous session', async () => {
  const f = fixture();
  assert.equal((await f.invoke({ action: 'create' }, false, false)).status, 401);
  f.setUser({ id: owner, is_anonymous: true });
  assert.equal((await f.invoke({ action: 'create' })).status, 401);
  assert.equal(f.calls.length, 0);
});
test('retries reuse the saved link without generating another provider invoice', async () => {
  const f = fixture();
  for (let i=0;i<2;i++) assert.equal((await f.invoke({ action: 'create', period: 'basic', request_id: requestId })).status,200);
  assert.equal(f.calls.filter(c=>c.url?.endsWith('/links')).length,1);
});
test('forged webhook and wrong amount never grant access', async () => {
  const f = fixture(); f.setPaid(false);
  assert.equal((await f.invoke({ ...reference, paid: true, amount: 9700, user_id: owner }, true)).status,400);
  f.setPaid(true); f.setAmount(1);
  assert.equal((await f.invoke(reference,true)).status,400);
  assert.equal(f.counts().saves,0);
});
test('provider approval is persisted once; duplicate delivery does not regrant', async () => {
  const f = fixture();
  assert.equal((await f.invoke(reference,true)).status,200);
  assert.equal((await f.invoke(reference,true)).status,200);
  assert.equal(f.counts().saves,1);
  assert.equal(f.calls.filter(c=>c.url?.endsWith('/payment_check')).length,1);
});
test('another account cannot claim the receipt or query provider status through this order', async () => {
  const f = fixture(); f.setUser({ id: other });
  assert.equal((await f.invoke({ action: 'verify', ...reference })).status,403);
  assert.equal(f.calls.length,0);
});
test('a second genuine payment for an already paid order is queued for support, never granted twice', async () => {
  const f = fixture();
  await f.invoke(reference,true);
  const response=await f.invoke({ ...reference,transaction_nsu:'another-payment' },true);
  assert.equal(response.status,200);assert.equal((await response.json()).manual_review,true);
  assert.deepEqual(f.counts(),{saves:1,reviews:1});
});
test('shared external purchases are queued for review without granting a guessed account', async () => {
  const f = fixture();
  assert.equal((await f.invoke({ ...reference, order_nsu: 'shared-provider-order' },true)).status,200);
  assert.deepEqual(f.counts(),{ saves:0,reviews:1 });
});
test('provider outage preserves pending state and permits a later retry', async () => {
  const f = fixture(); f.offline();
  assert.equal((await f.invoke(reference,true)).status,400);
  assert.equal(f.order.status,'pending'); assert.equal(f.counts().saves,0);
});
test('URL flags and receipt URLs are not proof, and external checkout URLs are allowlisted', () => {
  assert.equal(parsePaymentReturn('?paid=true&success=true&receipt_url=https://evil.test'),null);
  assert.equal(parsePaymentReturn('?order_nsu=a&order_nsu=b'),null);
  assert.deepEqual(parsePaymentReturn('?order_nsu=order-1&slug=invoice-1&transaction_nsu=txn-1'),{ order_nsu:'order-1',slug:'invoice-1',transaction_nsu:'txn-1' });
  assert.throws(()=>checkoutUrl('https://evil.test/ronynapoleao/1'));
  assert.equal(checkoutUrl('https://checkout.infinitepay.io/ronynapoleao?lenc=signed.123_v1'), 'https://checkout.infinitepay.io/ronynapoleao?lenc=signed.123_v1');
  assert.throws(()=>checkoutUrl('https://checkout.infinitepay.io/other?lenc=signed.123_v1'));
  assert.throws(()=>checkoutUrl('https://checkout.infinitepay.io/ronynapoleao?lenc=signed.123_v1&redirect=https://evil.test'));
  assert.throws(()=>paymentReference({ order_nsu:'x',transaction_nsu:'a',slug:'https://evil.test' }));
  assert.equal(verifiedPayment({ success:true,paid:true,amount:9700,paid_amount:9699 },9700),false);
  assert.equal(verifiedPayment({ success:true,paid:'true',amount:9700,paid_amount:9700 },9700),false);
});
