// Intelligence Hub Sync — espelha eventos do app no Banco Supra central
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SOURCE_SYSTEM = "9fit-pro";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supraUrl = Deno.env.get("SUPRA_HUB_URL");
    const supraKey = Deno.env.get("SUPRA_HUB_SERVICE_KEY");

    if (!supraUrl || !supraKey) {
      console.warn("[hub-sync] SUPRA_HUB_URL ou SUPRA_HUB_SERVICE_KEY ausentes");
      return new Response(
        JSON.stringify({ ok: false, skipped: true, reason: "hub_not_configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // This function forwards data using a central service credential. It must
    // never accept an anonymous event or identity fields chosen by the client.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimData, error: claimError } = await caller.auth.getClaims(token);
    const userId = claimData?.claims?.sub as string | undefined;
    const userEmail = claimData?.claims?.email as string | undefined;
    if (claimError || !userId) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      event_type,
      payload = {},
      // Identity is derived from the JWT, never supplied by the browser.
      aluno_id: _ignoredAlunoId,
      aluno_email: _ignoredAlunoEmail,
      occurred_at,
    } = body ?? {};

    if (!event_type || typeof event_type !== "string") {
      return new Response(
        JSON.stringify({ ok: false, error: "event_type é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const hubPayload = {
      source_system: SOURCE_SYSTEM,
      event_type,
      aluno_email: userEmail ?? null,
      aluno_id: null,
      payload: { ...payload, _user_id: userId },
      occurred_at: occurred_at ?? new Date().toISOString(),
    };

    const url = `${supraUrl.replace(/\/$/, "")}/rest/v1/intelligence_hub`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: supraKey,
        Authorization: `Bearer ${supraKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(hubPayload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn("[hub-sync] Hub recusou:", res.status, text);
      return new Response(
        JSON.stringify({ ok: false, status: res.status, body: text }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[hub-sync] erro:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
