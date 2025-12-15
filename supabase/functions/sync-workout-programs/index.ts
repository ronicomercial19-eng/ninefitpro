import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE44_API_KEY = Deno.env.get('BASE44_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting workout programs sync...');
    
    // Fetch workout programs from Base44
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/WorkoutProgram`, {
      headers: {
        'api_key': BASE44_API_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const base44Programs = await response.json();
    console.log(`Fetched ${base44Programs.length} programs from Base44`);

    // Sync each program to our Supabase database
    const syncResults: Array<{ action: string; program?: any; error?: string }> = [];
    
    for (const program of base44Programs) {
      try {
        // Check if program already exists
        const { data: existingProgram } = await supabase
          .from('programs')
          .select('*')
          .eq('program_name', program.name)
          .single();

        if (existingProgram) {
          // Update existing program
          const { data: updatedProgram, error } = await supabase
            .from('programs')
            .update({
              description: program.description || '',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProgram.id)
            .select()
            .single();

          if (error) throw error;
          syncResults.push({ action: 'updated', program: updatedProgram });
        } else {
          // Create new program
          const { data: newProgram, error } = await supabase
            .from('programs')
            .insert({
              program_name: program.name,
              description: program.description || ''
            })
            .select()
            .single();

          if (error) throw error;
          syncResults.push({ action: 'created', program: newProgram });
        }
      } catch (syncError) {
        console.error(`Error syncing program ${program.name}:`, syncError);
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        syncResults.push({ action: 'error', program: program.name, error: errorMessage });
      }
    }

    console.log('Sync completed:', syncResults);

    return new Response(JSON.stringify({
      success: true,
      synced: syncResults.length,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sync error:', error);
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
