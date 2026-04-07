import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const API_URLS = [
  "https://vrbhljmsakruoejctclg.supabase.co/functions/v1/sync-exercise-library",
  "https://bibliteoca9fit.lovable.app/api/exercises.json",
];

type LibraryExercise = {
  id?: number | string;
  name?: string;
  category?: string;
  subcategory?: string;
  youtubeId?: string;
  youtube_id?: string;
};

type FetchResult = {
  exercises: LibraryExercise[];
  source: string;
};

function normalizeLibraryPayload(payload: unknown): LibraryExercise[] {
  if (Array.isArray(payload)) return payload as LibraryExercise[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { exercises?: unknown[] }).exercises)) {
    return (payload as { exercises: LibraryExercise[] }).exercises;
  }
  return [];
}

async function fetchExercisesFromAPI(req: Request): Promise<FetchResult | null> {
  const requestUrl = new URL(req.url);
  const category = requestUrl.searchParams.get("category");
  const subcategory = requestUrl.searchParams.get("subcategory");

  for (const baseUrl of API_URLS) {
    try {
      const url = new URL(baseUrl);
      if (category) url.searchParams.set("category", category);
      if (subcategory) url.searchParams.set("subcategory", subcategory);

      console.log(`Trying API: ${url.toString()}`);
      const resp = await fetch(url.toString(), {
        headers: {
          "Accept": "application/json",
          "User-Agent": "9FIT-PRO-SYNC/1.0",
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) {
        console.log(`API ${url.toString()} returned ${resp.status}`);
        continue;
      }

      const contentType = resp.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        console.log(`API ${url.toString()} returned non-JSON content-type: ${contentType}`);
        continue;
      }

      const payload = await resp.json();
      const exercises = normalizeLibraryPayload(payload);
      if (exercises.length > 0) {
        console.log(`Successfully fetched ${exercises.length} exercises from ${url.toString()}`);
        return { exercises, source: url.toString() };
      }
    } catch (e) {
      console.log(`Failed to fetch from ${baseUrl}: ${e.message}`);
    }
  }
  return null;
}

// Accept optional exercises array in request body as fallback
async function getExercisesFromBody(req: Request): Promise<FetchResult | null> {
  try {
    const body = await req.clone().json();
    if (body?.exercises && Array.isArray(body.exercises)) {
      return { exercises: body.exercises as LibraryExercise[], source: "request-body" };
    }

    if (body?.api_url) {
      const resp = await fetch(body.api_url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "9FIT-PRO-SYNC/1.0",
        },
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        const payload = await resp.json();
        const exercises = normalizeLibraryPayload(payload);
        if (exercises.length > 0) {
          return { exercises, source: body.api_url };
        }
      }
    }
  } catch { /* no body or invalid */ }
  return null;
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

async function upsertInBatches(supabaseAdmin: ReturnType<typeof createClient>, rows: ReturnType<typeof mapExerciseToRow>[]) {
  let synced = 0;
  let errors = 0;
  const errorDetails: string[] = [];
  const validRows = rows.filter(Boolean);
  const chunkSize = 100;

  for (let i = 0; i < validRows.length; i += chunkSize) {
    const chunk = validRows.slice(i, i + chunkSize);
    const { error } = await supabaseAdmin.from("exercises").upsert(chunk, {
      onConflict: "name",
      ignoreDuplicates: false,
    });

    if (!error) {
      synced += chunk.length;
      continue;
    }

    console.error(`Batch upsert failed for chunk starting at ${i}:`, error.message);

    for (const row of chunk) {
      const { error: rowError } = await supabaseAdmin.from("exercises").upsert(row, {
        onConflict: "name",
        ignoreDuplicates: false,
      });

      if (rowError) {
        errors++;
        errorDetails.push(`${row.name}: ${rowError.message}`);
        console.error(`Error syncing ${row.name}:`, rowError.message);
      } else {
        synced++;
      }
    }
  }

  return { synced, errors, errorDetails };
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
    let result = await fetchExercisesFromAPI(req);
    if (!result) {
      console.log("API unavailable, trying request body...");
      result = await getExercisesFromBody(req);
    }

    if (!result || result.exercises.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Biblioteca 9FIT indisponível. Não foi possível obter os exercícios pelas URLs públicas configuradas.",
        hint: "Verifique a edge pública da biblioteca ou envie os exercícios no body: { exercises: [...] }.",
      }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const rows = result.exercises.map((exercise) => mapExerciseToRow(exercise, userId));
    const { synced, errors, errorDetails } = await upsertInBatches(supabaseAdmin, rows);

    return new Response(JSON.stringify({
      success: true,
      data: { total: result.exercises.length, synced, errors, errorDetails: errorDetails.slice(0, 5) },
      metadata: { timestamp: new Date().toISOString(), source: result.source },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("sync-exercise-library error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
