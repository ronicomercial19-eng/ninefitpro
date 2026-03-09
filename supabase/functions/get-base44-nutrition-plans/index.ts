import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return apiError('UNAUTHORIZED', 'Missing authorization', 401);

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (claimsError || !claimsData?.claims) return apiError('INVALID_TOKEN', 'Invalid token', 401);

  try {
    const { userEmail } = await req.json();
    
    console.log(`Fetching nutrition plans for user: ${userEmail || 'all users'}`);
    
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/NutritionPlan`, {
      headers: { 'api_key': BASE44_API_KEY!, 'Content-Type': 'application/json' }
    });

    if (!response.ok) throw new Error(`Base44 API error: ${response.status}`);

    const nutritionPlans = await response.json();
    const activePlans = nutritionPlans.filter((plan: any) => plan.is_active === true);

    return apiResponse({ plans: activePlans, count: activePlans.length });
  } catch (error) {
    return apiError('FETCH_ERROR', error instanceof Error ? error.message : 'Unknown error', 500);
  }
});
