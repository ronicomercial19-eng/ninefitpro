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
    
    console.log(`Fetching nutrition plans for user: ${userEmail || 'all users'}`);
    
    // Fetch nutrition plans from Base44
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/NutritionPlan`, {
      headers: {
        'api_key': BASE44_API_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const nutritionPlans = await response.json();
    
    // Filter active plans
    const activePlans = nutritionPlans.filter((plan: any) => plan.is_active === true);

    console.log(`Found ${activePlans.length} active nutrition plans`);

    return new Response(JSON.stringify({
      success: true,
      plans: activePlans
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching nutrition plans:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      error: errorMessage,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
