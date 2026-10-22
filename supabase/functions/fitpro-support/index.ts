import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Entre na sua conta' }, 401);
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user?.email || user.is_anonymous) return json({ error: 'Conta inválida' }, 401);
    if (Number(req.headers.get('content-length') || 0) > 16000) return json({ error: 'Mensagem muito longa' }, 413);
    const input = await req.json();
    const subject = typeof input.subject === 'string' ? input.subject.trim() : '';
    const message = typeof input.message === 'string' ? input.message.trim() : '';
    if (subject.length < 3 || subject.length > 120 || /[\r\n]/.test(subject) || message.length < 10 || message.length > 3000) return json({ error: 'Confira assunto e mensagem' }, 400);
    const { count, error: limitError } = await client.from('support_tickets').select('id', { count: 'exact', head: true }).eq('requester_user_id', user.id).gte('created_at', new Date(Date.now() - 3600000).toISOString());
    if (limitError) return json({ error: 'Suporte temporariamente indisponível' }, 503);
    if ((count || 0) >= 5) return json({ error: 'Limite de solicitações. Aguarde ou use o e-mail de suporte.' }, 429);
    const { data: ticket, error } = await client.from('support_tickets').insert({ requester_user_id: user.id, requester_name: 'Usuário 9FIT', requester_email: user.email, subject, message }).select('id').single();
    if (error || !ticket) return json({ error: 'Não foi possível registrar' }, 503);
    let emailSent = false;
    const key = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('SUPPORT_FROM_EMAIL');
    if (key && from) {
      try {
        const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `fitpro-support-${ticket.id}` }, body: JSON.stringify({ from, to: ['9fit.nine@gmail.com'], reply_to: user.email, subject: `[9FIT Suporte] ${subject}`, text: `Protocolo: ${ticket.id}\nResponder para: ${user.email}\n\n${message}` }), signal: AbortSignal.timeout(15000) });
        emailSent = response.ok;
      } catch { /* Ticket remains available; never report delivery without confirmation. */ }
    }
    return json({ id: ticket.id, email_sent: emailSent });
  } catch { return json({ error: 'Falha ao processar solicitação' }, 500); }
});
