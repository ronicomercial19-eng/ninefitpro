// Postura Pro Scan — orquestra análise postural via API do Postura Pro Analyser.
// Contrato real (docs do Postura Pro): POST {base}/analysis/photo, uma chamada por vista, com
// { student_id, view, image_base64, context? } e header Authorization: Bearer fpk_...
// Resposta por vista: { metrics, findings, pattern_match, risk, recommendations }.
// A versão anterior chamava {base}/analyze com URLs assinadas — rota que não existe no provedor.
import { createClient } from "npm:@supabase/supabase-js@2";
import { loadConnectorSecret } from "../_shared/connectorSecret.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VIEW_BY_SIDE = {
  front: "anterior",
  back: "posterior",
  left: "sagittal_left",
  right: "sagittal_right",
} as const;
type Side = keyof typeof VIEW_BY_SIDE;
type View = typeof VIEW_BY_SIDE[Side];
const LABEL: Record<View, string> = {
  anterior: "Frente",
  posterior: "Costas",
  sagittal_left: "Lado esq.",
  sagittal_right: "Lado dir.",
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

async function toDataUrl(admin: any, path: string): Promise<string> {
  const { data: blob, error } = await admin.storage.from("assessments").download(path);
  if (error || !blob) throw new Error("Could not access posture image");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${blob.type || "image/jpeg"};base64,${btoa(bin)}`;
}

const asText = (v: unknown): string =>
  typeof v === "string" ? v : v && typeof v === "object" ? JSON.stringify(v) : String(v);

// Converte as 4 respostas do provedor no formato que a tela lê (summary, findings[{region,note,severity}]).
function buildResult(analyses: Array<[View, any]>) {
  const findings: Array<{ region: string; note: string; severity: string; view: View }> = [];
  const recommendations = new Set<string>();
  const patterns = new Set<string>();
  const risks: string[] = [];

  for (const [view, r] of analyses) {
    const risk = r.risk == null ? null : asText(typeof r.risk === "object" ? (r.risk.level ?? r.risk.nivel ?? r.risk) : r.risk);
    if (risk) risks.push(`${LABEL[view]}: ${risk}`);
    if (r.pattern_match) {
      const pm = r.pattern_match;
      patterns.add(typeof pm === "object" ? asText(pm.name ?? pm.nome ?? pm.pattern ?? pm) : asText(pm));
    }
    for (const f of Array.isArray(r.findings) ? r.findings : []) {
      if (f && typeof f === "object") {
        findings.push({
          region: asText(f.region ?? f.regiao ?? f.segment ?? LABEL[view]),
          note: asText(f.note ?? f.descricao ?? f.description ?? f.finding ?? f.achado ?? f),
          severity: asText(f.severity ?? f.severidade ?? risk ?? "n/d"),
          view,
        });
      } else {
        findings.push({ region: LABEL[view], note: asText(f), severity: risk ?? "n/d", view });
      }
    }
    for (const rec of Array.isArray(r.recommendations) ? r.recommendations : []) {
      recommendations.add(rec && typeof rec === "object" ? asText(rec.title ?? rec.name ?? rec.descricao ?? rec) : asText(rec));
    }
  }

  const summary = [
    patterns.size ? `Padrões: ${[...patterns].join("; ")}` : null,
    risks.length ? `Risco — ${risks.join(" · ")}` : null,
  ].filter(Boolean).join(" | ") || "Análise concluída.";

  return {
    provider: "postura_pro",
    summary,
    findings,
    recommendations: [...recommendations],
    views: Object.fromEntries(analyses),
  };
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

    const fail = async (status: string, message: string, httpStatus: number, detail?: string) => {
      await admin.from("postura_scans").update({
        status,
        result: { error: message },
        updated_at: new Date().toISOString(),
      }).eq("id", scan_id);
      return json({ error: detail ?? message }, httpStatus);
    };

    // Lê configuração do connector
    const { data: connector } = await admin
      .from("api_connectors").select("*").eq("key", "postura_pro").maybeSingle();

    if (connector?.status !== "active" || !connector.endpoint) {
      return fail("unavailable", "Postura Pro API não está configurada; nenhuma análise foi gerada.", 503,
        "Postura Pro API is not configured; no analysis was generated.");
    }

    // Sem token o provedor responde "Missing bearer token". Falha cedo, sem enviar as fotos.
    const secret = await loadConnectorSecret(admin, "postura_pro", connector.secret_ref);
    if (!secret) {
      return fail("unavailable", "Chave da API do Postura Pro não configurada; reconecte em Postura Pro > Conectar.", 503,
        "Postura Pro API key is not configured; no analysis was generated.");
    }

    let result: ReturnType<typeof buildResult>;
    try {
      const base = connector.endpoint.replace(/\/$/, "");
      const studentId = scan.athlete_id || userId;
      const analyses = await Promise.all(
        (Object.entries(VIEW_BY_SIDE) as Array<[Side, View]>).map(async ([side, view]) => {
          const image = await toDataUrl(admin, assessmentPath(scan[`${side}_url`], imageOwnerId));
          const r = await fetch(`${base}/analysis/photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
            body: JSON.stringify({ student_id: studentId, view, image_base64: image }),
            signal: AbortSignal.timeout(100_000),
          });
          if (!r.ok) throw new Error(`Postura Pro provider returned ${r.status} (${view})`);
          const data = await r.json();
          if (!data || typeof data !== "object") throw new Error(`Postura Pro provider returned an invalid response (${view})`);
          // O provedor pode responder 200 com corpo de erro; isso NÃO é um laudo.
          if (data.error) throw new Error(`Postura Pro provider error (${view}): ${String(data.error).slice(0, 120)}`);
          return [view, data] as [View, any];
        }),
      );
      result = buildResult(analyses);
    } catch (e: any) {
      return fail("error", "O serviço de análise não respondeu. Tente novamente mais tarde.", 502, e?.message ?? "Postura Pro provider unavailable");
    }

    await admin.from("postura_scans").update({
      status: "done", result, updated_at: new Date().toISOString(),
    }).eq("id", scan_id);

    return json({ ok: true, result });
  } catch (e: any) {
    return json({ error: e?.message ?? "internal" }, 500);
  }
});
