import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE44_API_KEY = Deno.env.get('BASE44_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check - require authenticated user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      throw new Error('Email do usuário é obrigatório');
    }

    console.log(`Fetching training plans for user: ${userEmail}`);
    
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/TrainingPlan`, {
      headers: { 'api_key': BASE44_API_KEY!, 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const trainingPlans = await response.json();
    const userPlans = trainingPlans.filter((plan: any) => 
      plan.athlete_name && plan.athlete_name.toLowerCase().includes(userEmail.toLowerCase().split('@')[0])
    );

    return new Response(JSON.stringify({ success: true, plans: userPlans }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
