// Postura Pro Scan — orquestra análise postural via API externa configurada em api_connectors.
// Recebe scan_id, lê fotos do Storage e envia ao serviço externo, grava resultado.
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveConnectorSecret } from "../_shared/connectorSecret.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function assessmentPath(value: unknown, ownerId: string): string {
  if (typeof value !== "string") throw new Error("Missing posture image");
  const marker = "/storage/v1/object/public/assessments/";
  const raw = value.includes(marker) ? value.split(marker)[1]?.split("?")[0] : value;
  const path = decodeURIComponent(raw ?? "");
  if (!path.startsWith(`${ownerId}/`) || path.includes("..")) throw new Error("Invalid posture image path");
  return path;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: authErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { scan_id } = (await req.json().catch(() => ({}))) as { scan_id?: string };
    if (!scan_id) return json({ error: "scan_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: scan, error: scanErr } = await admin
      .from("postura_scans").select("*").eq("id", scan_id).maybeSingle();
    if (scanErr || !scan) return json({ error: "scan not found" }, 404);
    if (scan.user_id !== userId) return json({ error: "Forbidden" }, 403);

    // A coach may submit on behalf of a linked athlete; the scan owner remains
    // the caller, but the image folder and result belong to that athlete.
    if (scan.athlete_id) {
      const { data: athlete, error: athleteError } = await supabase.from("athletes")
        .select("id").eq("id", scan.athlete_id).maybeSingle();
      if (athleteError || !athlete) return json({ error: "Athlete not accessible" }, 403);
    }
    const imageOwnerId = scan.athlete_id || userId;

    await admin.from("postura_scans").update({ status: "processing" }).eq("id", scan_id);

    // Lê configuração do connector
    const { data: connector } = await admin
      .from("api_connectors").select("*").eq("key", "postura_pro").maybeSingle();

    if (connector?.status !== "active" || !connector.endpoint) {
      await admin.from("postura_scans").update({
        status: "unavailable",
        result: { error: "Postura Pro API não está configurada; nenhuma análise foi gerada." },
        updated_at: new Date().toISOString(),
      }).eq("id", scan_id);
      return json({ error: "Postura Pro API is not configured; no analysis was generated." }, 503);
    }

    // Sem chave resolvida o provedor responde "Missing bearer token". Falha cedo e com mensagem
    // clara, em vez de enviar as fotos e gravar o erro do provedor como se fosse laudo.
    const secret = resolveConnectorSecret(connector.secret_ref, "postura_pro");
    if (!secret) {
      await admin.from("postura_scans").update({
        status: "unavailable",
        result: { error: "Chave da API do Postura Pro não configurada; nenhuma análise foi gerada." },
        updated_at: new Date().toISOString(),
      }).eq("id", scan_id);
      return json({ error: "Postura Pro API key is not configured; no analysis was generated." }, 503);
    }

    let result: any;
    try {
        const imageUrls: Record<string, string> = {};
        for (const side of ["front", "back", "left", "right"]) {
          const path = assessmentPath(scan[`${side}_url`], imageOwnerId);
          const { data: signed, error: signError } = await admin.storage.from("assessments").createSignedUrl(path, 600);
          if (signError || !signed?.signedUrl) throw new Error("Could not access posture image");
          imageUrls[side] = signed.signedUrl;
        }
        const r = await fetch(`${connector.endpoint.replace(/\/$/, "")}/analyze`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            front: imageUrls.front, back: imageUrls.back,
            left: imageUrls.left, right: imageUrls.right,
          }),
        });
        if (!r.ok) throw new Error(`Postura Pro provider returned ${r.status}`);
        result = await r.json();
        if (!result || typeof result !== "object") throw new Error("Postura Pro provider returned an invalid response");
        // O provedor pode responder 200 com corpo de erro; isso NÃO é um laudo.
        if (result.error) throw new Error(`Postura Pro provider error: ${String(result.error).slice(0, 120)}`);
    } catch (e: any) {
      await admin.from("postura_scans").update({
        status: "error",
        result: { error: "O serviço de análise não respondeu. Tente novamente mais tarde." },
        updated_at: new Date().toISOString(),
      }).eq("id", scan_id);
      return json({ error: e?.message ?? "Postura Pro provider unavailable" }, 502);
    }

    await admin.from("postura_scans").update({
      status: "done", result, updated_at: new Date().toISOString(),
    }).eq("id", scan_id);

    return json({ ok: true, result });
  } catch (e: any) {
    return json({ error: e?.message ?? "internal" }, 500);
  }
});
