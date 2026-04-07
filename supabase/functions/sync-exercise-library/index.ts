import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Possible API URLs to try (published URL first, then preview)
const API_URLS = [
  "https://532c9940-31b6-4987-968f-fd292029beee.lovable.app/api/exercises.json",
  "https://id-preview--532c9940-31b6-4987-968f-fd292029beee.lovable.app/api/exercises.json",
];

async function fetchExercisesFromAPI(): Promise<any[] | null> {
  for (const url of API_URLS) {
    try {
      console.log(`Trying API: ${url}`);
      const resp = await fetch(url, { 
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) { console.log(`API ${url} returned ${resp.status}`); continue; }
      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.includes("json")) { 
        console.log(`API ${url} returned non-JSON content-type: ${contentType}`); 
        continue; 
      }
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Successfully fetched ${data.length} exercises from ${url}`);
        return data;
      }
    } catch (e) {
      console.log(`Failed to fetch from ${url}: ${e.message}`);
    }
  }
  return null;
}

// Accept optional exercises array in request body as fallback
async function getExercisesFromBody(req: Request): Promise<any[] | null> {
  try {
    const body = await req.clone().json();
    if (body?.exercises && Array.isArray(body.exercises)) return body.exercises;
    if (body?.api_url) {
      const resp = await fetch(body.api_url, { headers: { "Accept": "application/json" } });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data)) return data;
      }
    }
  } catch { /* no body or invalid */ }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify authenticated user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.replace("Bearer ", "");
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = claimsData.claims.sub as string;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Try API first, then request body
    let exercises = await fetchExercisesFromAPI();
    if (!exercises) {
      console.log("API unavailable, trying request body...");
      exercises = await getExercisesFromBody(req);
    }

    if (!exercises || exercises.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Biblioteca 9FIT indisponível. Publique o projeto da biblioteca ou envie os exercícios no body: { exercises: [...] }",
        hint: "A URL da API da biblioteca precisa estar publicada (não preview). Publique o projeto no Lovable e tente novamente.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let synced = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    for (const ex of exercises) {
      const youtubeId = ex.youtubeId || ex.youtube_id || "";
      const videoUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
      const thumbUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null;

      const { error } = await supabaseAdmin.from("exercises").upsert({
        name: String(ex.name || "").slice(0, 255),
        target_muscles: [String(ex.subcategory || ex.category || "Geral")],
        equipment: String(ex.category || "").slice(0, 100) || null,
        video_url: videoUrl,
        external_video_id: youtubeId || null,
        gif_url: thumbUrl,
        description: `Categoria: ${ex.category || ""} | Subcategoria: ${ex.subcategory || ""}`,
        created_by: userId,
      }, { onConflict: "name", ignoreDuplicates: false });

      if (error) {
        errors++;
        errorDetails.push(`${ex.name}: ${error.message}`);
        console.error(`Error syncing ${ex.name}:`, error.message);
      } else {
        synced++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { total: exercises.length, synced, errors, errorDetails: errorDetails.slice(0, 5) },
      metadata: { timestamp: new Date().toISOString(), source: "api" },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("sync-exercise-library error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
