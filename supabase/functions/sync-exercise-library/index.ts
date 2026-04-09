import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_URL = "https://bibliteoca9fit.lovable.app/api/exercises.json";

type LibraryExercise = {
  id?: number | string;
  name?: string;
  category?: string;
  subcategory?: string;
  youtubeId?: string;
  youtube_id?: string;
};

function normalizeLibraryPayload(payload: unknown): LibraryExercise[] {
  if (Array.isArray(payload)) return payload as LibraryExercise[];
  if (payload && typeof payload === "object" && Array.isArray((payload as any).exercises)) {
    return (payload as any).exercises;
  }
  return [];
}

function mapExerciseToRow(exercise: LibraryExercise, userId: string) {
  const name = String(exercise.name || "").trim().slice(0, 255);
  const category = String(exercise.category || "").trim();
  const subcategory = String(exercise.subcategory || "").trim();
  const youtubeId = String(exercise.youtubeId || exercise.youtube_id || "").trim();

  if (!name) return null;

  return {
    name,
    target_muscles: [subcategory || category || "Geral"],
    equipment: category.slice(0, 100) || null,
    video_url: youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null,
    external_video_id: youtubeId || null,
    gif_url: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null,
    description: [
      category ? `Categoria: ${category}` : null,
      subcategory ? `Subcategoria: ${subcategory}` : null,
    ].filter(Boolean).join(" | ") || null,
    created_by: userId,
  };
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

  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Use getUser() instead of getClaims() which doesn't exist
  const { data: userData, error: userError } = await authClient.auth.getUser();
  if (userError || !userData?.user) {
    console.error("Auth error:", userError?.message);
    return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    let exercises: LibraryExercise[] = [];
    let source = "unknown";

    // 1. Try request body first (frontend fallback)
    try {
      const body = await req.clone().json();
      if (body?.exercises && Array.isArray(body.exercises) && body.exercises.length > 0) {
        exercises = body.exercises;
        source = "request-body";
        console.log(`Got ${exercises.length} exercises from request body`);
      }
    } catch { /* no body */ }

    // 2. If no body data, try API
    if (exercises.length === 0) {
      try {
        console.log(`Fetching from API: ${API_URL}`);
        const resp = await fetch(API_URL, {
          headers: { "Accept": "application/json", "User-Agent": "9FIT-PRO-SYNC/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        
        if (resp.ok) {
          const contentType = resp.headers.get("content-type") || "";
          if (contentType.includes("json")) {
            const payload = await resp.json();
            exercises = normalizeLibraryPayload(payload);
            source = API_URL;
            console.log(`Fetched ${exercises.length} exercises from API`);
          } else {
            console.log(`API returned non-JSON: ${contentType}`);
          }
        } else {
          console.log(`API returned ${resp.status}`);
        }
      } catch (e) {
        console.log(`API fetch failed: ${e.message}`);
      }
    }

    if (exercises.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Não foi possível obter exercícios da biblioteca.",
        hint: "Envie os exercícios no body: { exercises: [...] }",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Map and upsert
    const rows = exercises.map(e => mapExerciseToRow(e, userId)).filter(Boolean);
    let synced = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    const chunkSize = 100;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabaseAdmin.from("exercises").upsert(chunk, {
        onConflict: "name",
        ignoreDuplicates: false,
      });

      if (!error) {
        synced += chunk.length;
      } else {
        console.error(`Batch error at ${i}:`, error.message);
        // Fallback: insert one by one
        for (const row of chunk) {
          const { error: rowErr } = await supabaseAdmin.from("exercises").upsert(row, {
            onConflict: "name", ignoreDuplicates: false,
          });
          if (rowErr) { errors++; errorDetails.push(`${(row as any).name}: ${rowErr.message}`); }
          else { synced++; }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { total: exercises.length, synced, errors, errorDetails: errorDetails.slice(0, 5) },
      metadata: { timestamp: new Date().toISOString(), source },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("sync-exercise-library error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
