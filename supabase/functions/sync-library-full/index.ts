import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIBRARY_URL = "https://bibliteoca9fit.lovable.app/api/library.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch full library
    const resp = await fetch(LIBRARY_URL, { headers: { Accept: "application/json" } });
    if (!resp.ok) {
      return new Response(JSON.stringify({ success: false, error: `Library API: ${resp.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const payload = await resp.json();
    const items: any[] = payload?.items || [];

    // Build all rows up-front (no row-count cap)
    const rows: any[] = [];
    let skipped = 0;
    for (const it of items) {
      let type = String(it.type || "").toLowerCase().trim();
      // Normaliza variações para um vocabulário canônico
      const VIDEO_ALIASES = new Set(["video", "videos", "streaming", "aula", "class", "treino-video", "treino_video"]);
      if (VIDEO_ALIASES.has(type)) type = "videos";
      // Heurística: se tem player/video URL e nenhum type claro, assume videos
      const hasPlayer = !!(it.playerUrl || it.videoUrl);
      if (!type && hasPlayer) type = "videos";
      const external_id = String(it.id ?? it.slug ?? it.external_id ?? "").trim();
      const name = it.name || it.title || "Sem nome";
      if (!type || !external_id) { skipped++; continue; }
      rows.push({
        external_id,
        type,
        slug: it.slug || null,
        name,
        category: it.category || null,
        subcategory: it.subcategory || null,
        thumbnail_url: it.thumbnailUrl || it.coverUrl || it.image || null,
        player_url: it.playerUrl || it.videoUrl || it.detailUrl || it.url || null,
        payload: it,
        synced_at: new Date().toISOString(),
      });
    }


    // Batched upsert (500/chunk) — no upper bound on total rows
    const CHUNK = 500;
    let synced = 0, errors = skipped;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("library_items")
        .upsert(chunk, { onConflict: "type,external_id" });
      if (error) { errors += chunk.length; console.error("upsert chunk", i, error.message); }
      else synced += chunk.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: { synced, errors, total: items.length, counts: payload?.counts || {} },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
