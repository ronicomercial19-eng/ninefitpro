import {withPaidAccess} from "../_shared/paidAccess.ts";
// Quick workout: invokes RPC prescrever_treino and optionally delivers to FitPro.
// Body: { aluno_id?: string, data?: string (YYYY-MM-DD), deliver_to_fitpro?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(withPaidAccess(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const { aluno_id, data, deliver_to_fitpro = true } = body ?? {};

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use the caller's JWT so prescrever_treino's auth.uid() permission checks succeed.
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: rpc, error } = await userClient.rpc("prescrever_treino", {
      p_aluno_id: aluno_id ?? null,
      p_data: data ?? new Date().toISOString().slice(0, 10),
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result: any = rpc;

    // If no periodization, notify professor and return CTA
    if (result?.sucesso === false && result?.motivo === "sem_periodizacao_ativa") {
      const admin = createClient(SUPABASE_URL, SERVICE);
      if (result.aluno_id) {
        await admin.rpc("notificar_falta_periodizacao", { p_aluno_id: result.aluno_id });
      }
      return new Response(
        JSON.stringify({
          success: false,
          motivo: "sem_periodizacao_ativa",
          sugestao_cta: "cadastrar_periodizacao",
          aluno_id: result.aluno_id,
          message:
            "Aluno sem periodização ativa. Cadastre uma no SmartPeriodizer para liberar a geração automática.",
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let delivery: any = null;
    if (deliver_to_fitpro && result?.sucesso) {
      try {
        const deliverResp = await fetch(
          `${SUPABASE_URL}/functions/v1/fitpro-deliver-workout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE}`,
            },
            body: JSON.stringify({
              athlete_id: result.contexto?.aluno_id ?? result.contexto?.athlete_id,
              aluno_id: result.contexto?.aluno_id,
              plano_id: result.historico_id,
              historico_id: result.historico_id,
              workout_date: data ?? new Date().toISOString().slice(0, 10),
              source: "quick_workout",
              contexto: result.contexto,
              treino: result.treino,
            }),
          },
        );
        delivery = await deliverResp.json().catch(() => null);
      } catch (e) {
        console.warn("Delivery to FitPro failed:", e);
        delivery = { success: false, error: String(e) };
      }
    }

    return new Response(
      JSON.stringify({ success: true, prescrição: result, delivery }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-quick-workout error", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}, {bucket:'ai'}));
