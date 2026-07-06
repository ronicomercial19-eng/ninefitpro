import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/api-public/, '').replace(/\/+$/, '') || '/';

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Health check
    if (req.method === 'GET' && (path === '/health' || path === '/v1/health')) {
      return json({ status: 'ok', service: 'api-public', time: new Date().toISOString() });
    }

    // Auth: check x-api-key OR Bearer token
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('Authorization');
    const integrationApiKey = Deno.env.get('INTEGRATION_API_KEY');

    let isAdmin = false;
    let authedEmail: string | null = null;

    if (apiKey && integrationApiKey && apiKey === integrationApiKey) {
      isAdmin = true;
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser(token);
      if (data?.user) {
        authedEmail = data.user.email;
      }
    } else {
      return json({ success: false, error: 'Authentication required' }, 401);
    }

    // --- GET /v1/student_profile ---
    if (req.method === 'GET' && path === '/v1/student_profile') {
      const email = url.searchParams.get('email');
      if (!email) return json({ success: false, error: 'email required' }, 400);

      if (!isAdmin && authedEmail !== email) {
        return json({ success: false, error: 'Access denied' }, 403);
      }

      const { data, error } = await supabase
        .from('athletes')
        .select('id, email, nome:nome, altura_cm, peso_atual, objetivo, nivel_experiencia, status')
        .eq('email', email)
        .single();

      if (error) return json({ success: false, error: 'Profile not found' }, 404);
      return json({ success: true, data });
    }

    // --- GET /v1/student_assessments ---
    if (req.method === 'GET' && path === '/v1/student_assessments') {
      const email = url.searchParams.get('email');
      if (!email) return json({ success: false, error: 'email required' }, 400);

      if (!isAdmin && authedEmail !== email) {
        return json({ success: false, error: 'Access denied' }, 403);
      }

      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('email', email)
        .single();

      if (!athlete) return json({ success: false, error: 'Athlete not found' }, 404);

      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
      const { data, error } = await supabase
        .from('avaliacoes_unificadas')
        .select('*')
        .eq('athlete_id', athlete.id)
        .order('data_avaliacao', { ascending: false })
        .limit(limit);

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, data, count: data?.length || 0 });
    }

    // --- GET /v1/student_scores ---
    if (req.method === 'GET' && path === '/v1/student_scores') {
      const email = url.searchParams.get('email');
      if (!email) return json({ success: false, error: 'email required' }, 400);

      if (!isAdmin && authedEmail !== email) {
        return json({ success: false, error: 'Access denied' }, 403);
      }

      const { data: athlete } = await supabase
        .from('athletes')
        .select('id, nome')
        .eq('email', email)
        .single();

      if (!athlete) return json({ success: false, error: 'Athlete not found' }, 404);

      const { data: latest, error } = await supabase
        .from('avaliacoes_unificadas')
        .select(
          'score_forca, score_resistencia, score_core, score_cardio, score_mobilidade, score_global, flags_inteligentes, data_avaliacao'
        )
        .eq('athlete_id', athlete.id)
        .order('data_avaliacao', { ascending: false })
        .limit(1)
        .single();

      if (error) return json({ success: true, data: { student_name: athlete.nome, scores: null } });

      return json({
        success: true,
        data: {
          student_name: athlete.nome,
          latest_assessment_date: latest?.data_avaliacao,
          scores: {
            forca: latest?.score_forca,
            resistencia: latest?.score_resistencia,
            core: latest?.score_core,
            cardio: latest?.score_cardio,
            mobilidade: latest?.score_mobilidade,
            global: latest?.score_global,
          },
          flags: latest?.flags_inteligentes || [],
        },
      });
    }

    // --- POST /v1/link_user ---
    if (req.method === 'POST' && path === '/v1/link_user') {
      if (!isAdmin) return json({ success: false, error: 'Admin only' }, 403);

      const body = await req.json();
      const { email, external_user_id } = body;
      if (!email || !external_user_id) {
        return json({ success: false, error: 'email and external_user_id required' }, 400);
      }

      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('email', email)
        .single();

      if (!athlete) return json({ success: false, error: 'Athlete not found' }, 404);

      const { error } = await supabase.from('athlete_auth_link').upsert(
        { athlete_id: athlete.id, user_id: external_user_id },
        { onConflict: 'athlete_id' }
      );

      if (error) return json({ success: false, error: error.message }, 500);
      return json({ success: true, data: { athlete_id: athlete.id, linked: true } });
    }

    return json({ success: false, error: `Unknown action: ${path}` }, 404);
  } catch (err: any) {
    console.error('api-public error:', err);
    return json({ success: false, error: err.message }, 500);
  }
});
