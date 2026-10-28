import {withPaidAccess} from "../_shared/paidAccess.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withPaidAccess(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const callerId = userData.user.id;

    const { athleteId } = await req.json();
    if (!athleteId) {
      return new Response(JSON.stringify({ success: false, error: 'athleteId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: link } = await supabase
      .from('athlete_auth_link')
      .select('athlete_id')
      .eq('user_id', callerId)
      .eq('athlete_id', athleteId)
      .maybeSingle();

    const isOwner = !!link;
    if (!isOwner) {
      const { data: roleData } = await supabase.rpc('get_user_role', { p_user_id: callerId }).catch(() => ({ data: null }));
      const role = roleData as string | null;
      const isStaff = role === 'trainer' || role === 'admin' || role === 'super_admin';
      if (!isStaff) {
        return new Response(JSON.stringify({ success: false, error: 'Not authorized for this athlete' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { data: athlete, error: athleteErr } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single();

    if (athleteErr || !athlete) {
      return new Response(JSON.stringify({ success: false, error: 'Athlete not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CORREÇÃO: historico_treinos_realizados só tem aluno_id (legado), nunca athlete_id.
    // Resolve via athletes.aluno_id antes de consultar; se não houver vínculo, retorna
    // histórico vazio em vez de nunca encontrar nada silenciosamente.
    let workoutHistory: any[] | null = null;
    if (athlete.aluno_id) {
      const { data } = await supabase
        .from('historico_treinos_realizados')
        .select('*')
        .eq('aluno_id', athlete.aluno_id)
        .order('data_treino', { ascending: false })
        .limit(10);
      workoutHistory = data;
    }

    const prompt = `
Baseado nos dados do atleta e histórico de treinos recente, forneça recomendações dinâmicas:

**PERFIL DO ATLETA:**
- Nome: ${athlete.name}
- Nível: ${athlete.experience_level}
- Objetivo: ${athlete.primary_goal}
- Frequência semanal: ${athlete.weekly_frequency}x

**HISTÓRICO RECENTE:**
${workoutHistory?.map(w => `- ${w.data_treino}: ${w.volume_total_kg}kg volume, intensidade ${w.intensidade_media}/10`).join('\n') || 'Sem histórico recente'}

**FORNEÇA (JSON):**
{
  "status_geral": {
    "score": 0-100,
    "tendencia": "melhorando|estavel|deteriorando",
    "alerta": "string ou null"
  },
  "recomendacoes": [
    {
      "tipo": "volume|intensidade|recuperacao|tecnica",
      "prioridade": "alta|media|baixa",
      "titulo": "string",
      "descricao": "string",
      "acao_sugerida": "string"
    }
  ],
  "proximos_passos": ["string", "string"],
  "insights": ["string", "string"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um especialista em periodização esportiva. Analise dados e forneça recomendações precisas em JSON.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    let recommendations = null;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          recommendations = JSON.parse(jsonMatch[0]);
        } catch (_e) {
          recommendations = null;
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      recommendations,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-dynamic-recommendations:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}, {bucket:'ai'}));
