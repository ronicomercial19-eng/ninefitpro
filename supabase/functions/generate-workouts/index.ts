import {withPaidAccess} from "../_shared/paidAccess.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(withPaidAccess(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { athleteId, periodizationId, weeks = 12 } = await req.json();

    if (!athleteId || !periodizationId) {
      throw new Error('athleteId and periodizationId are required');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: athlete } = await supabase
      .from('athletes')
      .select('*')
      .eq('id', athleteId)
      .single();

    const { data: periodization } = await supabase
      .from('periodization_models')
      .select('*')
      .eq('id', periodizationId)
      .single();

    if (!athlete || !periodization) {
      throw new Error('Athlete or periodization not found');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = `
Você é um Personal Trainer Especialista. Crie uma estrutura de treinos detalhada.

**PERFIL DO ATLETA**:
- Nome: ${athlete.name}
- Experiência: ${athlete.experience_level}
- Objetivo: ${athlete.primary_goal}
- Frequência: ${athlete.weekly_frequency}x/semana
- Ambiente: ${athlete.training_environment}
- Limitações: ${athlete.injuries_limitations || 'Nenhuma'}

**MODELO DE PERIODIZAÇÃO**:
${JSON.stringify(periodization, null, 2)}

**DURAÇÃO**: ${weeks} semanas

Gere um JSON com a seguinte estrutura:
{
  "weeks": [
    {
      "week_number": 1,
      "phase": "Adaptação Anatômica",
      "focus": "Volume Alto, Intensidade Baixa",
      "workouts": [
        {
          "day_number": 1,
          "name": "Treino A - Peito e Tríceps",
          "exercises": [
            {
              "name": "Supino Reto com Barra",
              "sets": 4,
              "reps": "12-15",
              "rest_seconds": 60,
              "load_percentage": "60-65%",
              "notes": "Foco em execução perfeita"
            }
          ]
        }
      ]
    }
  ]
}

Seja ESPECÍFICO e PERSONALIZADO. Ajuste volume, intensidade e exercícios baseado no perfil.
`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Você é um Personal Trainer especialista em periodização.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API Error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const workoutStructure = JSON.parse(
      aiData.choices[0].message.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
    );

    const workoutsToInsert = [];
    for (const week of workoutStructure.weeks) {
      for (const workout of week.workouts) {
        workoutsToInsert.push({
          student_id: athleteId,
          week_number: week.week_number,
          day_number: workout.day_number,
          phase: week.phase,
          exercises: workout.exercises,
          notes: `${workout.name} - ${week.focus}`,
          status: 'pending'
        });
      }
    }

    const { data: insertedWorkouts, error: insertError } = await supabase
      .from('workouts')
      .insert(workoutsToInsert)
      .select();

    if (insertError) throw insertError;

    console.log(`Generated ${insertedWorkouts.length} workouts for athlete ${athleteId}`);

    return new Response(
      JSON.stringify({
        success: true,
        workouts: insertedWorkouts,
        structure: workoutStructure
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Error generating workouts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}, {bucket:'ai'}));
