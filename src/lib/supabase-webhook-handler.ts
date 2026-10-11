import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente Supabase com a chave de serviço para privilégios administrativos
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Handler para processar webhooks do InfinitePay.
 * Valida a assinatura, identifica o usuário e atualiza o plano no Supabase.
 */
export async function handleInfinitePayWebhook(payload: any, signature: string) {
  // 1. Validação de Segurança
  if (signature !== process.env.INFINITEPAY_WEBHOOK_SECRET) {
    throw new Error('Assinatura do webhook inválida.');
  }

  const { user_email, plan_id, customer_id } = payload;

  if (!user_email && !customer_id) {
    throw new Error('Usuário não identificado no payload.');
  }

  // 2. Mapeamento do plano
  // Ajuste estes IDs conforme configurado no seu InfinitePay
  const planType = plan_id === 'TatHaBMsUX' ? 'pro' : 'active';

  // 3. Busca e Atualiza no Supabase
  let query = supabaseAdmin.from('profiles').update({ plan_status: planType });
  
  if (user_email) {
    query = query.eq('email', user_email);
  } else {
    query = query.eq('customer_id', customer_id);
  }

  const { error } = await query;

  if (error) {
    console.error('Erro ao atualizar plano no Supabase:', error);
    throw error;
  }

  return { success: true, user_email, planType };
}
