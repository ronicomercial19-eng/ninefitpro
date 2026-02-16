import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BASE44_API_KEY = Deno.env.get('BASE44_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check - require trainer role
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const userId = claimsData.claims.sub;
  const { data: roleCheck } = await authClient.from('user_roles').select('role').eq('user_id', userId).single();
  if (!roleCheck || !['admin', 'super_admin', 'trainer'].includes(roleCheck.role)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Starting classes sync...');
    
    const response = await fetch(`https://app.base44.com/api/apps/689f4841c22f3258293f0457/entities/Aula`, {
      headers: { 'api_key': BASE44_API_KEY!, 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Base44 API error: ${response.status}`);
    }

    const base44Classes = await response.json();
    const syncResults: Array<{ action: string; class?: any; error?: string }> = [];
    
    for (const classItem of base44Classes) {
      try {
        const { data: existingClass } = await supabase
          .from('gym_classes').select('*')
          .eq('class_name', classItem.name).eq('class_datetime', classItem.datetime).single();

        const classData = {
          class_name: classItem.name,
          location: classItem.location || '',
          instructor_name: classItem.instructor || '',
          class_datetime: classItem.datetime,
          available_slots: 20,
          description: classItem.modality || '',
          updated_at: new Date().toISOString()
        };

        if (existingClass) {
          const { data: updatedClass, error } = await supabase
            .from('gym_classes').update(classData).eq('id', existingClass.id).select().single();
          if (error) throw error;
          syncResults.push({ action: 'updated', class: updatedClass });
        } else {
          const { data: newClass, error } = await supabase
            .from('gym_classes').insert(classData).select().single();
          if (error) throw error;
          syncResults.push({ action: 'created', class: newClass });
        }
      } catch (syncError) {
        const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';
        syncResults.push({ action: 'error', class: classItem.name, error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ success: true, synced: syncResults.length, results: syncResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage, success: false }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
