import {withPaidAccess} from "../_shared/paidAccess.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function resolvePath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function substituteThis(block: string, item: any): string {
  return block.replace(/\{\{this\.([\w.]+)\}\}/g, (_, p) => {
    const val = resolvePath(item, p);
    if (val === undefined || val === null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }).replace(/\{\{this\}\}/g, () => String(item ?? ""));
}

// Busca balanceada do {{/each}} que fecha o {{#each}} correspondente, suportando aninhamento
function findMatchingEach(str: string, startIdx: number): number {
  let depth = 1;
  let idx = startIdx;
  while (depth > 0) {
    const nextOpen = str.indexOf("{{#each", idx + 1);
    const nextClose = str.indexOf("{{/each}}", idx + 1);
    if (nextClose === -1) return -1;
    if (nextOpen !== -1 && nextOpen < nextClose) { depth++; idx = nextOpen; }
    else { depth--; idx = nextClose; }
  }
  return idx;
}

// Handlebars-like minimal renderer: {{var}}, {{#each arr}}...{{/each}} (com aninhamento), {{#if cond}}...{{/if}}
function render(template: string, data: Record<string, any>): string {
  let out = template;

  let guard = 0;
  while (out.includes("{{#each") && guard++ < 100) {
    const openMatch = out.match(/\{\{#each ([\w.]+)\}\}/);
    if (!openMatch) break;
    const openIdx = openMatch.index!;
    const path = openMatch[1];
    const afterOpen = openIdx + openMatch[0].length;
    const closeIdx = findMatchingEach(out, afterOpen - 1);
    if (closeIdx === -1) break;
    const inner = out.slice(afterOpen, closeIdx);
    const arr = resolvePath(data, path);
    let replacement = "";
    if (Array.isArray(arr)) {
      replacement = arr.map((item) => {
        let block = inner;
        let g2 = 0;
        while (block.includes("{{#each this.") && g2++ < 30) {
          const nOpen = block.match(/\{\{#each this\.([\w.]+)\}\}/);
          if (!nOpen) break;
          const nOpenIdx = nOpen.index!;
          const nPath = nOpen[1];
          const nAfter = nOpenIdx + nOpen[0].length;
          const nCloseIdx = findMatchingEach(block, nAfter - 1);
          if (nCloseIdx === -1) break;
          const nInner = block.slice(nAfter, nCloseIdx);
          const nested = resolvePath(item, nPath);
          const nRepl = Array.isArray(nested) ? nested.map((nItem: any) => substituteThis(nInner, nItem)).join("") : "";
          block = block.slice(0, nOpenIdx) + nRepl + block.slice(nCloseIdx + "{{/each}}".length);
        }
        block = block.replace(/\{\{#if this\.([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, p, innerInner) => {
          const val = resolvePath(item, p);
          return val ? innerInner : "";
        });
        return substituteThis(block, item);
      }).join("");
    }
    out = out.slice(0, openIdx) + replacement + out.slice(closeIdx + "{{/each}}".length);
  }

  out = out.replace(/\{\{#if ([\w.]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, path, inner) => {
    const val = resolvePath(data, path);
    return val ? inner : "";
  });

  out = out.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const val = resolvePath(data, path);
    if (val === undefined || val === null) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  });

  return out;
}

function buildVariables(prescricao: any, alunoNome: string, professorNome: string): Record<string, any> {
  const ctx = prescricao.contexto ?? {};
  const params = prescricao.parametros ?? {};
  const treino = prescricao.treino ?? {};

  const blocosOrdenados = [
    { key: "neural", label: "Fase 1", titulo: "Ativação Neural", duracao: "5-8 min" },
    { key: "integracao", label: "Fase 2", titulo: "Integração", duracao: "8-10 min" },
    { key: "bloco9", label: "Fase 3", titulo: "Execução Principal", duracao: "25-35 min" },
    { key: "reset", label: "Fase 4", titulo: "Reset & Recuperação", duracao: "5-8 min" },
  ];

  let globalIdx = 0;
  const blocos = blocosOrdenados.map((b) => {
    const exs = (treino[b.key] ?? []).map((ex: any) => {
      globalIdx++;
      return {
        idx: globalIdx, ordem: ex.ordem ?? globalIdx, nome: ex.nome ?? "Exercício",
        series: ex.series ?? 3, reps: ex.reps ?? "8-12", rpe: ex.rpe ?? 6,
        descanso: ex.descanso ?? "60s", nota_tecnica: ex.nota_tecnica ?? "",
      };
    });
    return { ...b, exercicios: exs };
  }).filter((b) => b.exercicios.length > 0);

  const totalExercicios = blocos.reduce((sum, b) => sum + b.exercicios.length, 0);

  return {
    aluno_nome: alunoNome, professor_nome: professorNome,
    protocolo_nome: ctx.protocolo ?? "Protocolo 9FIT", fase_nome: ctx.fase ?? "Fase não definida",
    semana_atual: ctx.semana_atual ?? 1, condicao_principal: ctx.pillar ?? "",
    contexto_clinico: `${ctx.protocolo ?? ""} — ${ctx.variacao ?? ""}`,
    total_exercicios: totalExercicios, blocos,
    blocos_numerados: blocos.map((b, i) => ({ numero: i + 1, titulo: b.titulo, exercicios: b.exercicios })),
    resumo_ciclo: `Semana ${ctx.semana_atual ?? 1} de ${ctx.fase ?? "ciclo atual"}. RPE alvo: ${params.rpe_alvo ?? "-"}.`,
    condicoes: [],
    checklist_pre_treino: [
      { criticidade: "", pergunta: "Está bem hidratado(a)?", explicacao: "Beba água antes de iniciar" },
      { criticidade: "", pergunta: "Fez o aquecimento?", explicacao: "Mobilidade articular geral" },
      { criticidade: "critical", pergunta: "Sem dor ou desconforto anormal?", explicacao: "Se sentir dor, não treine e contate o professor" },
    ],
    contraindicacoes: [], sinais_alerta: [], suplementos: [], rotina_dia: [], protocolo_emergencia: [],
    monitorar_pa: false, treinos: [], treinos_json: "{}",
    treino_titulo_inicial: ctx.protocolo ?? "", titulo_sessao: (ctx.protocolo ?? "TREINO").toUpperCase(),
    ciclo_nome: ctx.fase ?? "", duracao_total: params.duracao_estimada ?? "45-60",
    fases: blocos.map((b) => ({
      titulo: b.titulo, foco: b.titulo, duracao: b.duracao, icone: "●",
      cor_bg: "rgba(232,87,26,0.1)", cor_borda: "rgba(232,87,26,0.2)", cor_texto: "#E8571A", cor_bg_badge: "#E8571A",
      tabela: true, exercicios: b.exercicios,
    })),
    objetivo_prova: ctx.protocolo ?? "", data_prova: "", ritmo_alvo: params.reps_range ?? "",
    plano_semanal: [], notas_tecnicas: [], grafico_labels: "[]", grafico_valores: "[]", radar_data: "{}",
  };
}

Deno.serve(withPaidAccess(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { athlete_id, template_slug, data: overrideData, training_name } = await req.json();
    if (!athlete_id || !template_slug) {
      return new Response(JSON.stringify({ error: "athlete_id and template_slug required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: tpl, error: tplErr } = await admin
      .from("training_html_templates").select("*").eq("slug", template_slug).eq("ativo", true).single();
    if (tplErr || !tpl) {
      return new Response(JSON.stringify({ error: "template_not_found", detail: tplErr?.message }), { status: 404, headers: corsHeaders });
    }

    const { data: athlete } = await admin.from("athletes").select("name").eq("id", athlete_id).single();
    const { data: prescricao, error: rpcErr } = await admin.rpc("prescrever_treino", {
      p_aluno_id: athlete_id, p_data: new Date().toISOString().slice(0, 10),
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: "prescricao_failed", detail: rpcErr.message }), { status: 500, headers: corsHeaders });
    }
    if (prescricao && prescricao.sucesso === false) {
      return new Response(JSON.stringify({ error: "prescricao_incompleta", motivo: prescricao.motivo, sugestao_cta: prescricao.sugestao_cta }), { status: 422, headers: corsHeaders });
    }

    const baseVars = buildVariables(prescricao, athlete?.name ?? "Atleta", "9FIT");
    const vars = { ...baseVars, ...(overrideData ?? {}) };

    const renderedHtml = render(tpl.html_template, vars);

    const fileName = `${athlete_id}/${template_slug}_${Date.now()}.html`;
    const { error: uploadErr } = await admin.storage
      .from("training-html-files")
      .upload(fileName, new Blob([renderedHtml], { type: "text/html" }), { contentType: "text/html", upsert: false });
    if (uploadErr) {
      return new Response(JSON.stringify({ error: "upload_failed", detail: uploadErr.message }), { status: 500, headers: corsHeaders });
    }
    const { data: pub } = admin.storage.from("training-html-files").getPublicUrl(fileName);

    await admin.from("training_html_deliveries").insert({
      template_id: tpl.id, athlete_id, training_name: training_name ?? tpl.nome,
      rendered_html: renderedHtml, variaveis_usadas: vars, storage_path: fileName,
    });
    await admin.from("training_html_templates").update({ vezes_usado: (tpl.vezes_usado ?? 0) + 1 }).eq("id", tpl.id);

    await admin.from("student_training_assignments").insert({
      student_id: athlete_id, training_name: training_name ?? tpl.nome,
      html_file_url: pub.publicUrl, content_type: "html",
    }).then(() => null).catch(() => null);

    return new Response(JSON.stringify({ success: true, url: pub.publicUrl, template_used: tpl.slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown_error" }), { status: 500, headers: corsHeaders });
  }
}, {bucket:'ai'}));
