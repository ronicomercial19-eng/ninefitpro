import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/** Standardized API response */
function apiResponse(data: any, status = 200) {
  return new Response(JSON.stringify({
    success: status < 400,
    ...(status < 400 ? { data } : { error: data }),
    metadata: { timestamp: new Date().toISOString(), version: 'v1' }
  }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function apiError(code: string, message: string, status = 500) {
  return apiResponse({ code, message }, status);
}

const BASE44_API_KEY = Deno.env.get('BASE44_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED', 'Missing authorization', 401);

  const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (claimsError || !claimsData?.claims) return apiError('INVALID_TOKEN', 'Invalid token', 401);

  const userId = claimsData.claims.sub;
  const { data: roleCheck } = await authClient.from('user_roles').select('role').eq('user_id', userId).single();
  if (!roleCheck || !['admin', 'super_admin', 'trainer'].includes(roleCheck.role)) {
    return apiError('INSUFFICIENT_PERMISSIONS', 'Trainer role required', 403);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Starting exercises sync...');
    
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/Exercise`, {
      headers: { 'api_key': BASE44_API_KEY!, 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`Base44 API error: ${response.status}`);

    const base44Exercises = await response.json();
    console.log(`Fetched ${base44Exercises.length} exercises from Base44`);

    const syncResults: Array<{ action: string; exercise?: any; error?: string }> = [];
    
    for (const exercise of base44Exercises) {
      try {
        const { data: existingExercise } = await supabase
          .from('exercises').select('*').eq('name', exercise.name).single();

        const exerciseData = {
          name: exercise.name,
          description: exercise.instructions || '',
          target_muscles: exercise.muscle_group ? [exercise.muscle_group] : [],
          equipment: exercise.equipment || '',
          difficulty_level: exercise.difficulty || 'beginner',
          video_url: exercise.video_url || '',
          instructions: exercise.instructions || '',
          updated_at: new Date().toISOString()
        };

        if (existingExercise) {
          const { data: updated, error } = await supabase
            .from('exercises').update(exerciseData).eq('id', existingExercise.id).select().single();
          if (error) throw error;
          syncResults.push({ action: 'updated', exercise: updated });
        } else {
          const { data: created, error } = await supabase
            .from('exercises').insert(exerciseData).select().single();
          if (error) throw error;
          syncResults.push({ action: 'created', exercise: created });
        }
      } catch (syncError) {
        syncResults.push({ action: 'error', exercise: exercise.name, error: syncError instanceof Error ? syncError.message : 'Unknown error' });
      }
    }

    return apiResponse({ synced: syncResults.length, results: syncResults });
  } catch (error) {
    return apiError('SYNC_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
