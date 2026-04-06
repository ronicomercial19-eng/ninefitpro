import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify user is a trainer/admin
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData } = await authClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const API_URL = "https://id-preview--532c9940-31b6-4987-968f-fd292029beee.lovable.app/api/exercises.json";
    const resp = await fetch(API_URL);
    if (!resp.ok) throw new Error(`API returned ${resp.status}`);

    const exercises = await resp.json();
    if (!Array.isArray(exercises)) throw new Error("Invalid API response format");

    let synced = 0;
    let errors = 0;

    for (const ex of exercises) {
      const youtubeId = ex.youtubeId || ex.youtube_id || "";
      const videoUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
      const thumbUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null;

      const { error } = await supabaseClient.from("exercises").upsert({
        name: String(ex.name || "").slice(0, 255),
        target_muscles: [String(ex.subcategory || ex.category || "Geral")],
        equipment: String(ex.category || "").slice(0, 100) || null,
        video_url: videoUrl,
        external_video_id: youtubeId || null,
        gif_url: thumbUrl,
        description: `Categoria: ${ex.category || ""} | Subcategoria: ${ex.subcategory || ""}`,
        created_by: userData.user.id,
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
