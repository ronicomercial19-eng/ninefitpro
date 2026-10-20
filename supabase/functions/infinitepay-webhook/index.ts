import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const payload = await req.json()
    console.log("Webhook payload recebido:", payload)

    // Ajuste conforme a estrutura real do payload da InfinitePay
    const { user_email, plan_id } = payload

    if (!user_email || !plan_id) {
      return new Response(JSON.stringify({ error: 'Dados incompletos' }), { status: 400 })
    }

    // Mapeamento dos planos
    const planType = plan_id === 'TatHaBMsUX' ? 'pro' : 'active'

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ plan_status: planType })
      .eq('email', user_email)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (err) {
    console.error("Erro no webhook:", err)
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 })
  }
})
