import { supabase } from '@/integrations/supabase/client';
import { withTimeout } from '@/lib/withTimeout';
export async function paymentOperation(input: Record<string, unknown>) {
  const { data, error } = await withTimeout(supabase.functions.invoke('infinitepay-checkout', { body: input }), 20000);
  if (error) {
    let message = 'Não foi possível confirmar esta operação. Tente novamente; não faça outro pagamento.';
    try { const body = await error.context?.json(); if (typeof body?.error === 'string') message = body.error; } catch { /* Network failure. */ }
    throw new Error(message);
  }
  if (!data || data.error) throw new Error(data?.error || 'Resposta de pagamento indisponível.');
  return data as { status: 'ready'|'paid'|'pending'|'manual_review'; order_id?: string; period?: 'basic'|'annual'; url?: string; message?: string };
}
