// SmartPeriodizer sync — busca o plano via api_connectors.smart_periodizer e cacheia em periodization_plans_remote
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalizeRemotePlanning } from '../_shared/planningContract.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json(401, { error: "unauthorized" });

  const sbUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } });
  const { data: claims } = await sbUser.auth.getClaims(auth.replace("Bearer ", ""));
  if (!claims?.claims?.sub || claims.claims.is_anonymous === true) return json(401, { error: "unauthorized" });

  const body = await req.json().catch(() => ({}));
  const athleteId = body.athlete_id as string | undefined;
  if (!athleteId) return json(400, { error: "athlete_id required" });
  const { data: profile, error: profileError } = await sbUser.from("profiles").select("role,is_active").eq("user_id", claims.claims.sub).maybeSingle();
  if (profileError || !profile || profile.is_active === false) return json(403, { error: "forbidden" });
  const { data: athlete, error: athleteError } = await sbUser.from("athletes").select("id").eq("id", athleteId).maybeSingle();
  if (athleteError || !athlete) return json(403, { error: "athlete access denied" });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: conn } = await admin.from("api_connectors").select("endpoint, secret_ref, status")
    .eq("key", "smart_periodizer").maybeSingle();

  if (conn?.status !== "active" || !conn.endpoint) {
    return json(400, { error: "SmartPeriodizer não conectado. Configure em Admin → SmartPeriodizer." });
  }
  // The configured FitPro API can be this very project. Its annual plans are
  // already canonical: never copy a derived snapshot back as a newer remote plan.
  const endpoint = conn.endpoint.replace(/\/$/, '');
  if (endpoint === `${Deno.env.get('SUPABASE_URL')}/functions/v1/fitpro-api`) {
    const { data: local, error: localError } = await sbUser.from('vw_athlete_periodizacao_ativa')
      .select('plan_id,source').eq('athlete_id', athleteId).maybeSingle();
    if (localError) return json(502, { error: 'Não foi possível reler o planejamento' });
    if (!local?.plan_id) return json(404, { error: 'Nenhum planejamento ativo atribuído pela equipe' });
    return json(200, { ok: true, verified: true, plan_id: local.plan_id, mode: 'canonical_refresh' });
  }
  const partnerKey = conn.secret_ref ? Deno.env.get(conn.secret_ref) : null;
  if (!partnerKey) return json(503, { error: "SmartPeriodizer secret is not configured" });

  try {
    const r = await fetch(`${endpoint}/v1/fitpro/planejamento?fitpro_student_id=${encodeURIComponent(athleteId)}`, {
      headers: { "x-api-key": partnerKey }, signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) {
      return json(502, { error: `SmartPeriodizer respondeu ${r.status}` });
    }
    const plan = normalizeRemotePlanning(await r.json());
    const { data: saved, error: saveError } = await admin.from("periodization_plans_remote").upsert({
      athlete_id: athleteId,
      external_plan_id: plan.id,
      plan_name: plan.name,
      total_weeks: plan.weeks,
      current_week: plan.current,
      waves: plan.waves,
      raw_payload: plan.payload,
      status: 'active',
      last_synced_at: new Date().toISOString(),
    }, { onConflict: "athlete_id,external_plan_id" }).select('id,last_synced_at').single();
    if (saveError) return json(502, { error: "Could not save remote plan" });

    const { data: visible, error: visibleError } = await sbUser.from('vw_athlete_periodizacao_ativa').select('plan_id,source').eq('athlete_id',athleteId).maybeSingle();
    if (visibleError || !saved || visible?.plan_id !== saved.id || visible?.source !== 'periodization_plans_remote') return json(409,{error:'Plano salvo, mas a leitura canônica não confirmou sua seleção. Recarregue ou solicite revisão.'});
    return json(200, { ok: true, plan_id:saved.id, synced_at:saved.last_synced_at, verified:true });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
