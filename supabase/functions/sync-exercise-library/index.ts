import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Verify authenticated user using getClaims
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

  // Use service role client for DB operations (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const API_URL = "https://id-preview--532c9940-31b6-4987-968f-fd292029beee.lovable.app/api/exercises.json";
    console.log("Fetching exercises from:", API_URL);

    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error(`API returned ${resp.status}: ${await resp.text()}`);

    const exercises = await resp.json();
    if (!Array.isArray(exercises)) throw new Error("Invalid API response: expected array");

    console.log(`Received ${exercises.length} exercises from API`);

    let synced = 0;
    let errors = 0;

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

      if (error) { errors++; console.error(`Error syncing ${ex.name}:`, error.message); }
      else { synced++; }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { total: exercises.length, synced, errors },
      metadata: { timestamp: new Date().toISOString() },
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("sync-exercise-library error:", e);
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
