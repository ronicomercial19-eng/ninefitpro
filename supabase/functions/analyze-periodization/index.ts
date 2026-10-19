import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, userProfile } = await req.json();
    console.log('Analyzing periodization for profile:', userProfile?.name || 'Unknown');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ 
        analysis: createFallbackAnalysis(userProfile),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Você é um especialista em periodização de treinamento esportivo.
Analise o perfil do usuário e recomende as 3 melhores periodizações compatíveis.

IMPORTANTE: Responda APENAS com JSON válido no seguinte formato:
{
  "user_analysis": {
    "profile_summary": "resumo do perfil",
    "main_considerations": ["consideração 1", "consideração 2"],
    "training_priorities": ["prioridade 1", "prioridade 2"],
    "limitations": ["limitação 1"]
  },
  "recommendations": [
    {
      "title": "Nome da Periodização",
      "match_percentage": 95,
      "description": "Descrição detalhada",
      "duration": "12 semanas",
      "phases": ["Fase 1", "Fase 2", "Fase 3"],
      "match_factors": {
        "goal_alignment": 95,
        "experience_fit": 90,
        "frequency_compatibility": 85
      },
      "advantages": ["vantagem 1", "vantagem 2"],
      "customizations": ["ajuste 1", "ajuste 2"]
    }
  ]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          analysis: createFallbackAnalysis(userProfile),
          source: 'fallback'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        analysis: createFallbackAnalysis(userProfile),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Empty response from AI');
      return new Response(JSON.stringify({ 
        analysis: createFallbackAnalysis(userProfile),
        source: 'fallback'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse JSON from response
    let analysis;
    try {
      // Remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      analysis = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', content);
      analysis = createFallbackAnalysis(userProfile);
    }

    console.log('Analysis completed successfully');
    return new Response(JSON.stringify({ 
      analysis,
      source: 'ai'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-periodization:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      analysis: createFallbackAnalysis(null),
      source: 'fallback'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createFallbackAnalysis(userProfile: any) {
  const goal = userProfile?.goal || 'hipertrofia';
  const experience = userProfile?.experience || 'iniciante';
  const frequency = userProfile?.weeklyFrequency || 3;

  const recommendations = [];

  // Periodização Linear - boa para iniciantes
  if (experience === 'iniciante' || experience === 'intermediario') {
    recommendations.push({
      title: 'Periodização Linear Clássica',
      match_percentage: experience === 'iniciante' ? 95 : 85,
      description: 'Progressão gradual e linear de volume e intensidade. Ideal para construir uma base sólida de força e técnica.',
      duration: '12 semanas',
      phases: ['Adaptação Anatômica (3 sem)', 'Hipertrofia (4 sem)', 'Força (3 sem)', 'Pico/Deload (2 sem)'],
      match_factors: {
        goal_alignment: goal === 'hipertrofia' ? 90 : 75,
        experience_fit: experience === 'iniciante' ? 95 : 80,
        frequency_compatibility: frequency >= 3 ? 90 : 70
      },
      advantages: [
        'Fácil de seguir e monitorar',
        'Progressão previsível',
        'Menor risco de overtraining'
      ],
      customizations: [
        `Adaptado para ${frequency}x por semana`,
        `Foco em ${goal}`
      ]
    });
  }

  // Periodização Ondulatória - boa para intermediários/avançados
  if (experience === 'intermediario' || experience === 'avancado') {
    recommendations.push({
      title: 'Periodização Ondulatória Diária',
      match_percentage: experience === 'avancado' ? 92 : 88,
      description: 'Variação de intensidade e volume dentro da mesma semana. Maximiza adaptações e previne platôs.',
      duration: '8-12 semanas',
      phases: ['Dia Força', 'Dia Hipertrofia', 'Dia Potência', 'Recuperação Ativa'],
      match_factors: {
        goal_alignment: goal === 'performance' ? 95 : 85,
        experience_fit: experience === 'avancado' ? 95 : 85,
        frequency_compatibility: frequency >= 4 ? 95 : 75
      },
      advantages: [
        'Maior variação de estímulos',
        'Recuperação otimizada',
        'Evita platôs'
      ],
      customizations: [
        `Ondulação ajustada para ${frequency}x/semana`,
        `Ênfase em ${goal}`
      ]
    });
  }

  // Periodização em Blocos - universal
  recommendations.push({
    title: 'Periodização em Blocos',
    match_percentage: 82,
    description: 'Mesociclos concentrados com foco específico. Cada bloco desenvolve uma qualidade física prioritária.',
    duration: '16 semanas',
    phases: ['Bloco Acumulação (5 sem)', 'Bloco Transmutação (5 sem)', 'Bloco Realização (4 sem)', 'Deload (2 sem)'],
    match_factors: {
      goal_alignment: 80,
      experience_fit: experience === 'avancado' ? 90 : 75,
      frequency_compatibility: 85
    },
    advantages: [
      'Desenvolvimento profundo de qualidades',
      'Flexibilidade de ajustes',
      'Picos de performance planejados'
    ],
    customizations: [
      `Blocos adaptados para objetivo: ${goal}`,
      `Frequência: ${frequency}x/semana`
    ]
  });

  return {
    user_analysis: {
      profile_summary: `Perfil ${experience} com objetivo de ${goal}, treinando ${frequency}x por semana`,
      main_considerations: [
        `Nível de experiência: ${experience}`,
        `Objetivo principal: ${goal}`,
        `Frequência semanal: ${frequency} dias`
      ],
      training_priorities: [
        goal === 'hipertrofia' ? 'Volume progressivo' : 'Intensidade otimizada',
        'Recuperação adequada',
        'Técnica de execução'
      ],
      limitations: userProfile?.injuries ? [userProfile.injuries] : ['Nenhuma limitação reportada']
    },
    recommendations: recommendations.slice(0, 3)
  };
}
