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
    console.log('Starting classes sync...');
    
    // Fetch classes from Base44
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/Aula`, {
      headers: {
        'api_key': BASE44_API_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const base44Classes = await response.json();
    console.log(`Fetched ${base44Classes.length} classes from Base44`);

    // Sync each class to our Supabase database
    const syncResults: Array<{ action: string; class?: any; error?: string }> = [];
    
    for (const classItem of base44Classes) {
      try {
        // Check if class already exists
        const { data: existingClass } = await supabase
          .from('gym_classes')
          .select('*')
          .eq('class_name', classItem.name)
          .eq('class_datetime', classItem.datetime)
          .single();

        const classData = {
          class_name: classItem.name,
          location: classItem.location || '',
          instructor_name: classItem.instructor || '',
          class_datetime: classItem.datetime,
          available_slots: 20, // Default slots
          description: classItem.modality || '',
          updated_at: new Date().toISOString()
        };

        if (existingClass) {
          // Update existing class
          const { data: updatedClass, error } = await supabase
            .from('gym_classes')
            .update(classData)
            .eq('id', existingClass.id)
            .select()
            .single();

          if (error) throw error;
          syncResults.push({ action: 'updated', class: updatedClass });
        } else {
          // Create new class
          const { data: newClass, error } = await supabase
            .from('gym_classes')
            .insert(classData)
            .select()
            .single();

          if (error) throw error;
          syncResults.push({ action: 'created', class: newClass });
        }
      } catch (syncError) {
        console.error(`Error syncing class ${classItem.name}:`, syncError);
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        syncResults.push({ action: 'error', class: classItem.name, error: errorMessage });
      }
    }

    console.log('Classes sync completed:', syncResults);

    return new Response(JSON.stringify({
      success: true,
      synced: syncResults.length,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Classes sync error:', error);
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
