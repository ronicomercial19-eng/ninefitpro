import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://esm.sh/zod@3.23.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Standardized error response
const errorResponse = (status: number, code: string, message: string) =>
  new Response(
    JSON.stringify({ success: false, error: { code, message } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

// Standardized success response
const successResponse = (data: any, status = 200) =>
  new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );

// Validation schemas
const CreateAssessmentSchema = z.object({
  aluno_id: z.string().uuid(),
  data_avaliacao: z.string().max(50).optional(),
  peso: z.number().positive().max(500).optional(),
  altura: z.number().positive().min(30).max(300).optional(),
  gordura_corporal: z.number().min(0).max(100).optional(),
  massa_magra: z.number().nonnegative().optional(),
  massa_gorda: z.number().nonnegative().optional(),
  massa_muscular: z.number().nonnegative().optional(),
  imc: z.number().nonnegative().optional(),
  agua_corporal: z.number().nonnegative().optional(),
  taxa_metabolica: z.number().nonnegative().optional(),
  circunferencia_braco: z.number().nonnegative().optional(),
  circunferencia_peitoral: z.number().nonnegative().optional(),
  circunferencia_cintura: z.number().nonnegative().optional(),
  circunferencia_quadril: z.number().nonnegative().optional(),
  circunferencia_coxa: z.number().nonnegative().optional(),
  circunferencia_panturrilha: z.number().nonnegative().optional(),
  rml_abs: z.number().int().nonnegative().optional(),
  rml_flexao: z.number().int().nonnegative().optional(),
  rml_agachamento: z.number().int().nonnegative().optional(),
  rml_pull: z.number().int().nonnegative().optional(),
  rml_elevacao_p: z.number().int().nonnegative().optional(),
  rm1_empurrar_perna: z.number().nonnegative().optional(),
  rm1_puxar_costas: z.number().nonnegative().optional(),
  rm1_empurrar_superior: z.number().nonnegative().optional(),
  rm1_puxar_inferior: z.number().nonnegative().optional(),
  dobra_triceps: z.number().nonnegative().optional(),
  dobra_peitoral: z.number().nonnegative().optional(),
  dobra_abdominal: z.number().nonnegative().optional(),
  dobra_suprailiaca: z.number().nonnegative().optional(),
  dobra_coxa: z.number().nonnegative().optional(),
  dobra_panturrilha: z.number().nonnegative().optional(),
  dobra_subescapular: z.number().nonnegative().optional(),
  dobra_axilar_media: z.number().nonnegative().optional(),
  observacoes: z.string().max(2000).optional(),
  avaliador_nome: z.string().max(255).optional(),
  avaliador_cref: z.string().max(50).optional(),
  origem: z.string().max(50).default('api'),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // Expected: /api-assessments or /api-assessments/:id

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(401, 'UNAUTHORIZED', 'Missing or invalid authorization header');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: claims, error: authError } = await supabase.auth.getUser(token);
  if (authError || !claims?.user) {
    return errorResponse(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  const userId = claims.user.id;

  try {
    // GET — list or get by ID
    if (req.method === 'GET') {
      const assessmentId = url.searchParams.get('id');
      const studentId = url.searchParams.get('aluno_id');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

      if (assessmentId) {
        const { data, error } = await supabase
          .from('avaliacoes_unificadas')
          .select('*')
          .eq('id', assessmentId)
          .single();
        if (error) return errorResponse(404, 'NOT_FOUND', 'Assessment not found');
        return successResponse(data);
      }

      if (studentId) {
        const { data, error } = await supabase
          .from('avaliacoes_unificadas')
          .select('*')
          .eq('aluno_id', studentId)
          .order('data_avaliacao', { ascending: false })
          .limit(limit);
        if (error) return errorResponse(500, 'QUERY_ERROR', error.message);
        return successResponse(data);
      }

      return errorResponse(400, 'MISSING_PARAM', 'Provide id or aluno_id query parameter');
    }

    // POST — create assessment
    if (req.method === 'POST') {
      const rawBody = await req.json();
      const parsed = CreateAssessmentSchema.safeParse(rawBody);

      if (!parsed.success) {
        return errorResponse(400, 'VALIDATION_ERROR', JSON.stringify(parsed.error.flatten().fieldErrors));
      }

      const { data, error } = await supabase
        .from('avaliacoes_unificadas')
        .insert([parsed.data])
        .select('id, aluno_id, data_avaliacao, origem')
        .single();

      if (error) return errorResponse(500, 'INSERT_ERROR', error.message);
      return successResponse(data, 201);
    }

    // PATCH — update assessment
    if (req.method === 'PATCH') {
      const assessmentId = url.searchParams.get('id');
      if (!assessmentId) return errorResponse(400, 'MISSING_PARAM', 'Provide id query parameter');

      const updates = await req.json();
      // Remove protected fields
      delete updates.id;
      delete updates.aluno_id;
      delete updates.created_at;

      const { error } = await supabase
        .from('avaliacoes_unificadas')
        .update(updates)
        .eq('id', assessmentId);

      if (error) return errorResponse(500, 'UPDATE_ERROR', error.message);
      return successResponse({ id: assessmentId, updated: true });
    }

    return errorResponse(405, 'METHOD_NOT_ALLOWED', `Method ${req.method} not allowed`);

  } catch (error) {
    console.error('API error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal processing error');
  }
});
