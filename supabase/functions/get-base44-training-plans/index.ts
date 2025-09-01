import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE44_API_KEY = Deno.env.get('BASE44_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail } = await req.json();
    
    if (!userEmail) {
      throw new Error('Email do usuário é obrigatório');
    }

    console.log(`Fetching training plans for user: ${userEmail}`);
    
    // Fetch training plans from Base44
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/TrainingPlan`, {
      headers: {
        'api_key': BASE44_API_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const trainingPlans = await response.json();
    
    // Filter plans for the specific user (assuming athlete_name matches user email or name)
    const userPlans = trainingPlans.filter((plan: any) => 
      plan.athlete_name && plan.athlete_name.toLowerCase().includes(userEmail.toLowerCase().split('@')[0])
    );

    console.log(`Found ${userPlans.length} training plans for user`);

    return new Response(JSON.stringify({
      success: true,
      plans: userPlans
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching training plans:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});