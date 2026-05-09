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

    let synced = 0, errors = 0;
    for (const it of items) {
      const type = String(it.type || "").toLowerCase();
      const external_id = String(it.id ?? it.slug ?? it.external_id ?? "").trim();
      const name = it.name || it.title || "Sem nome";
      if (!type || !external_id) { errors++; continue; }

      const row = {
        external_id,
        type,
        slug: it.slug || null,
        name,
        category: it.category || null,
        subcategory: it.subcategory || null,
        thumbnail_url: it.thumbnailUrl || it.coverUrl || null,
        player_url: it.playerUrl || it.videoUrl || it.detailUrl || null,
        payload: it,
        synced_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("library_items")
        .upsert(row, { onConflict: "type,external_id" });
      if (error) { errors++; console.error("upsert", external_id, error.message); }
      else synced++;
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
