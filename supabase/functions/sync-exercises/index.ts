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
    console.log('Starting exercises sync...');
    
    // Fetch exercises from Base44
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/Exercise`, {
      headers: {
        'api_key': BASE44_API_KEY!,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const base44Exercises = await response.json();
    console.log(`Fetched ${base44Exercises.length} exercises from Base44`);

    // Sync each exercise to our Supabase database
    const syncResults = [];
    
    for (const exercise of base44Exercises) {
      try {
        // Check if exercise already exists
        const { data: existingExercise } = await supabase
          .from('exercises')
          .select('*')
          .eq('name', exercise.name)
          .single();

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
          // Update existing exercise
          const { data: updatedExercise, error } = await supabase
            .from('exercises')
            .update(exerciseData)
            .eq('id', existingExercise.id)
            .select()
            .single();

          if (error) throw error;
          syncResults.push({ action: 'updated', exercise: updatedExercise });
        } else {
          // Create new exercise
          const { data: newExercise, error } = await supabase
            .from('exercises')
            .insert(exerciseData)
            .select()
            .single();

          if (error) throw error;
          syncResults.push({ action: 'created', exercise: newExercise });
        }
      } catch (syncError) {
        console.error(`Error syncing exercise ${exercise.name}:`, syncError);
        syncResults.push({ action: 'error', exercise: exercise.name, error: syncError.message });
      }
    }

    console.log('Exercises sync completed:', syncResults);

    return new Response(JSON.stringify({
      success: true,
      synced: syncResults.length,
      results: syncResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Exercises sync error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});