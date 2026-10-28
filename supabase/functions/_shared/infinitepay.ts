import { checkoutUrl } from './infinitepayUrl.ts';
export { checkoutUrl };
export const INFINITEPAY_HANDLE = 'ronynapoleao';
export const INFINITEPAY_API = 'https://api.checkout.infinitepay.io';
export const APP_ORIGIN = 'https://ninefitpro.lovable.app';
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const identifier = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(v);
export function paymentReference(input: any) {
  const value = input?.data && typeof input.data === 'object' ? input.data : input;
  if (!identifier(value?.order_nsu) || !identifier(value?.transaction_nsu) || !identifier(value?.invoice_slug ?? value?.slug)) throw new Error('invalid_payment_reference');
  return { order_nsu: value.order_nsu, transaction_nsu: value.transaction_nsu, slug: value.invoice_slug ?? value.slug };
}
export function verifiedPayment(value: any, expected?: number): boolean {
  return value?.success === true && value?.paid === true && Number.isSafeInteger(value.amount) && value.amount > 0
    && Number.isSafeInteger(value.paid_amount) && value.paid_amount >= value.amount && (expected === undefined || value.amount === expected);
}
export async function providerRequest(path: '/links' | '/payment_check', body: unknown, fetcher: typeof fetch, apiKey?: string) {
  const response = await fetcher(INFINITEPAY_API + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(apiKey ? { 'X-Api-Key': apiKey } : {}) },
    body: JSON.stringify(body), signal: AbortSignal.timeout(12000), redirect: 'error',
  });
  if (!response.ok) throw new Error('provider_unavailable');
  return response.json();
}
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
type Dependencies = { db: any; authenticate: (authorization: string) => Promise<{ id: string; is_anonymous?: boolean } | null>; fetcher: typeof fetch; apiKey?: string };
async function readBody(req: Request) {
  if (Number(req.headers.get('content-length')) > 16000) throw new Error('invalid_body');
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  if (reader) try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 16000) { await reader.cancel().catch(() => {}); throw new Error('invalid_body'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const body = new TextDecoder().decode(bytes);
  try { const value = JSON.parse(body); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; } catch { throw new Error('invalid_body'); }
}
async function orderById(db: any, id: string) {
  if (!uuid(id)) return null;
  const { data, error } = await db.from('infinitepay_orders').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error('database_unavailable');
  return data;
}
export async function reconcilePayment(db: any, reference: ReturnType<typeof paymentReference>, fetcher: typeof fetch, apiKey?: string, order?: any, stageCandidate = true) {
  const current = order || await orderById(db, reference.order_nsu);
  if (current?.status === 'paid' && current.transaction_nsu === reference.transaction_nsu && current.invoice_slug === reference.slug) {
    const last = Date.parse(current.last_verified_at || current.paid_at || '');
    if(current.verification_state !== 'unconfirmed' && Number.isFinite(last) && Date.now()-last>=0 && Date.now()-last<300000) return { saved:true,already_saved:true };
    const proof=await providerRequest('/payment_check',{handle:INFINITEPAY_HANDLE,...reference},fetcher,apiKey);
    const {data,error}=await db.rpc('fn_fitpro_apply_payment_check',{p_order_id:current.id,p_verification:proof});
    if(error)throw new Error('payment_confirmation_failed');
    return data?.confirmed ? {saved:true,already_saved:true} : {saved:false,suspended:data?.suspended===true};
  }
  if (current && stageCandidate) {
    const staged = await db.rpc('fn_fitpro_stage_payment_candidate', {p_order_id:current.id,p_transaction_nsu:reference.transaction_nsu,p_invoice_slug:reference.slug});
    if (staged.error) throw new Error('database_unavailable');
  }
  const verification = await providerRequest('/payment_check', { handle: INFINITEPAY_HANDLE, ...reference }, fetcher, apiKey);
  if (!verifiedPayment(verification, current?.amount_cents)) return { saved: false };
  if (!current || current.status === 'paid') {
    const { error } = await db.from('infinitepay_payment_reviews').upsert({ transaction_nsu: reference.transaction_nsu, order_nsu: reference.order_nsu, invoice_slug: reference.slug, amount_cents: verification.amount, reason: current ? 'duplicate_payment' : 'unmatched_order' }, { onConflict: 'transaction_nsu', ignoreDuplicates: true });
    if (error) throw new Error('database_unavailable');
    return { saved: false, manual_review: true };
  }
  const { data, error } = await db.rpc('fn_confirm_infinitepay_order', { p_order_id: current.id, p_transaction_nsu: reference.transaction_nsu, p_invoice_slug: reference.slug, p_verification: verification });
  if (error || !data?.saved) throw new Error('payment_confirmation_failed');
  return data;
}
export function createPaymentHandler(deps: Dependencies, webhook = false) {
  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
    try {
      let user: { id: string; is_anonymous?: boolean } | null = null;
      if (!webhook) {
        const authorization = req.headers.get('Authorization') || '';
        if (!authorization.startsWith('Bearer ')) return json({ error: 'Entre na sua conta para continuar.' }, 401);
        user = await deps.authenticate(authorization);
        if (!user || user.is_anonymous) return json({ error: 'Entre em uma conta confirmada.' }, 401);
      }
      const input = await readBody(req);
      if (webhook) {
        // Payload fields never grant access. A server-to-server provider check is mandatory.
        const reference = paymentReference(input);
        const result = await reconcilePayment(deps.db, reference, deps.fetcher, deps.apiKey);
        return result.saved || result.manual_review || result.suspended ? json({ received: true, ...result }) : json({ error: 'Pagamento ainda não confirmado.' }, 400);
      }
      if (input.action === 'create') {
        if (!['basic', 'annual'].includes(input.period) || !uuid(input.request_id)) return json({ error: 'Confira o período escolhido.' }, 400);
        const { data: order, error } = await deps.db.rpc('fn_prepare_infinitepay_order', { p_user_id: user!.id, p_period: input.period, p_request_id: input.request_id });
        if (error) {
          if (error.message?.includes('access_already_confirmed')) return json({ error: 'Sua conta já possui acesso sem vencimento. Não é necessário pagar novamente.' }, 409);
          if (error.message?.includes('checkout_rate_limit')) return json({ error: 'Aguarde antes de gerar outra cobrança.' }, 429);
          throw new Error('checkout_unavailable');
        }
        if (order.status === 'paid') return json({ status: 'paid', order_id: order.id, period: order.period });
        if (order.checkout_url) return json({ status: 'ready', order_id: order.id, url: checkoutUrl(order.checkout_url) });
        if (!order.claimed) return json({ error: 'Seu checkout está sendo preparado. Aguarde alguns segundos e tente novamente.' }, 409);
        const generated = await providerRequest('/links', {
          handle: INFINITEPAY_HANDLE, order_nsu: order.id,
          items: [{ quantity: 1, price: order.amount_cents, description: input.period === 'basic' ? '9FIT PRO — 1 mês de acesso, pagamento único' : '9FIT PRO — 12 meses de acesso, pagamento único' }],
          redirect_url: APP_ORIGIN + '/9fit/pagamento/retorno',
          ...(deps.apiKey ? {
            webhook: {url:'https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/infinitepay-webhook',events:['paid','refunded']},
            options: {single_payment:true},
          } : {webhook_url:'https://mfrydtrzjxscbkaiwfnw.supabase.co/functions/v1/infinitepay-webhook'}),
        }, deps.fetcher, deps.apiKey);
        const { data: saved, error: saveError } = await deps.db.rpc('fn_attach_infinitepay_link', { p_order_id: order.id, p_url: checkoutUrl(generated.url) });
        if (saveError || !saved?.checkout_url) throw new Error('checkout_unavailable');
        return json({ status: 'ready', order_id: order.id, url: checkoutUrl(saved.checkout_url) });
      }
      if (input.action === 'status' || input.action === 'verify') {
        if (!uuid(input.order_nsu)) return json({ status: 'manual_review', message: 'Este pagamento não está vinculado a um pedido do app. Fale com o suporte e não pague novamente.' });
        const order = await orderById(deps.db, input.order_nsu);
        if (!order || order.user_id !== user!.id) return json({ error: 'O pedido não pertence a esta conta. Entre na conta usada na compra ou fale com o suporte.' }, 403);
        if (input.action === 'verify') {
          const result = await reconcilePayment(deps.db, paymentReference(input), deps.fetcher, deps.apiKey, order);
          if (result.saved) return json({ status: 'paid', order_id: order.id, period: order.period });
          if (result.manual_review) return json({ status: 'manual_review', order_id: order.id });
          if (result.suspended) return json({status:'pending',order_id:order.id,message:'Pagamento sem confirmação atual. Consulte sua conta ou o suporte.'});
        }
        return json({ status: order.status === 'paid' && order.verification_state !== 'unconfirmed' ? 'paid' : 'pending', order_id: order.id, period: order.period });
      }
      return json({ error: 'Solicitação inválida.' }, 400);
    } catch (error) {
      const invalid = /invalid_body|invalid_payment_reference/.test((error as Error).message);
      return json({ error: invalid ? 'Confira os dados do pedido.' : 'Não foi possível confirmar esta operação. Tente novamente; não faça outro pagamento.' }, invalid ? 400 : webhook ? 400 : 503);
    }
  };
}
