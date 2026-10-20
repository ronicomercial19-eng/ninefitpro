import { useCallback, useEffect, useState } from "react";
import { Target, Plus, X, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { ShareableCard } from "@/components/9fit/ShareableCard";
import { toast } from "sonner";

interface Meta {
  id: string;
  titulo: string;
  metrica: string;
  valor_inicial: number;
  valor_atual: number;
  valor_meta: number;
  unidade: string;
  status: string;
}

/** Meta é "decrescente" quando o alvo é menor que o inicial (ex: % de gordura, peso pra emagrecer). */
function isDecreasing(m: Meta) {
  return m.valor_meta < m.valor_inicial;
}

function progressPct(m: Meta) {
  const total = Math.abs(m.valor_meta - m.valor_inicial) || 1;
  const feito = isDecreasing(m) ? m.valor_inicial - m.valor_atual : m.valor_atual - m.valor_inicial;
  return Math.max(0, Math.min(100, Math.round((feito / total) * 100)));
}

function isAchieved(m: Meta) {
  return isDecreasing(m) ? m.valor_atual <= m.valor_meta : m.valor_atual >= m.valor_meta;
}

/**
 * Metas de Progresso — usa a tabela real `metas_progresso` (antes criada mas nunca
 * consumida por nenhuma tela). Ao atualizar o valor atual e bater a meta, status vira
 * "concluida" e abre o convite de compartilhar (goal_achieved), com dado real.
 */
export function MetasSection() {
  const { athleteId } = useAthleteId();
  const [metas, setMetas] = useState<Meta[]>([]);
  const [values, setValues] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [celebrating, setCelebrating] = useState<Meta | null>(null);
  const [form, setForm] = useState({ titulo: "", metrica: "peso", valor_inicial: "", valor_meta: "", unidade: "kg" });

  const load = useCallback(async () => {
    if (!athleteId) { setMetas([]); setLoading(false); return; }
    const { data } = await supabase
      .from("metas_progresso")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("created_at", { ascending: false });
    setMetas(data || []);
    setLoading(false);
  }, [athleteId]);

  useEffect(() => { load(); }, [load]);

  const createMeta = async () => {
    if (!athleteId || !form.titulo || !form.valor_inicial || !form.valor_meta) {
      toast.error("Preenche título, valor inicial e meta");
      return;
    }
    if (saving) return;
    const valorInicial = Number(form.valor_inicial.replace(",", "."));
    const valorMeta = Number(form.valor_meta.replace(",", "."));
    if (![valorInicial,valorMeta].every(Number.isFinite) || valorInicial < 0 || valorMeta <= 0 || valorInicial === valorMeta) return toast.error("Informe valores válidos e uma meta diferente do valor inicial");
    setSaving(true);
    const { error } = await supabase.from("metas_progresso").insert({
      athlete_id: athleteId,
      titulo: form.titulo,
      metrica: form.metrica,
      valor_inicial: valorInicial,
      valor_atual: valorInicial,
      valor_meta: valorMeta,
      unidade: form.unidade,
      status: "ativa",
    });
    setSaving(false);
    if (error) { toast.error("Erro ao criar meta", { description: error.message }); return; }
    window.dispatchEvent(new Event("9fit:sync_updated"));
    setShowNew(false);
    setForm({ titulo: "", metrica: "peso", valor_inicial: "", valor_meta: "", unidade: "kg" });
    load();
  };

  const updateValorAtual = async (m: Meta, novoValor: number) => {
    if (!Number.isFinite(novoValor) || novoValor < 0) return toast.error("Informe um valor válido");
    const atualizado = { ...m, valor_atual: novoValor };
    const achieved = isAchieved(atualizado) && m.status !== "concluida";
    const { error } = await supabase
      .from("metas_progresso")
      .update({ valor_atual: novoValor, status: isAchieved(atualizado) ? "concluida" : "ativa" })
      .eq("id", m.id).eq("athlete_id", athleteId).select("id").single();
    if (error) { toast.error("Erro ao atualizar"); return; }
    load();
    window.dispatchEvent(new Event("9fit:sync_updated"));
    if (achieved) setCelebrating(atualizado);
  };

  if (loading) return null;

  return (
    <div className="px-4 mt-8">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-primary" /> Metas
        </p>
        <button onClick={() => setShowNew(true)} className="text-xs text-primary flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova meta
        </button>
      </div>

      {metas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-muted-foreground">
          Nenhuma meta cadastrada ainda. Defina uma pra acompanhar sua evolução.
        </div>
      )}

      <div className="space-y-2.5">
        {metas.map((m) => {
          const pct = progressPct(m);
          return (
            <div key={m.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  {m.status === "concluida" && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  {m.titulo}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {m.valor_atual}{m.unidade} → {m.valor_meta}{m.unidade}
                </span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${m.status === "concluida" ? "bg-emerald-400" : "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {m.status !== "concluida" && (
                <div className="flex items-center gap-2 mt-2.5">
                  <input
                    type="text" inputMode="decimal" value={values[m.id] ?? ""} onChange={e => setValues(v => ({...v,[m.id]:e.target.value}))}
                    placeholder={`Valor atual (${m.unidade})`}
                    className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        const v = Number((e.target as HTMLInputElement).value.replace(",", "."));
                        if (!isNaN(v)) updateValorAtual(m, v);
                      }
                    }}
                  />
                  <button className="text-xs text-primary" disabled={!values[m.id]?.trim()} onClick={() => updateValorAtual(m, Number((values[m.id] || "").replace(",", ".")))}>Salvar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal nova meta */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowNew(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-primary/30 bg-background p-5 pb-8 sm:pb-5 space-y-3"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="font-display text-lg">Nova meta</p>
                <button onClick={() => setShowNew(false)}><X className="w-4 h-4" /></button>
              </div>
              <input
                placeholder="Título (ex: Perder gordura, Ganhar força)"
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text" inputMode="decimal" placeholder="Valor inicial" value={form.valor_inicial}
                  onChange={(e) => setForm((f) => ({ ...f, valor_inicial: e.target.value }))}
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                />
                <input
                  type="text" inputMode="decimal" placeholder="Meta" value={form.valor_meta}
                  onChange={(e) => setForm((f) => ({ ...f, valor_meta: e.target.value }))}
                  className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Un." value={form.unidade}
                  onChange={(e) => setForm((f) => ({ ...f, unidade: e.target.value }))}
                  className="w-16 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm"
                />
              </div>
              <select aria-label="Tipo da meta" value={form.metrica} onChange={e => setForm(f => ({...f,metrica:e.target.value,unidade:e.target.value === "distancia" ? "km" : e.target.value === "gordura" ? "%" : "kg"}))} className="w-full bg-background border border-white/10 rounded p-2"><option value="peso">Peso corporal</option><option value="carga">Força / carga</option><option value="distancia">Corrida / distância</option><option value="gordura">Gordura corporal</option></select>
              <button disabled={saving} onClick={createMeta} className="w-full rounded-full bg-primary text-primary-foreground py-3 font-bold">
                Criar meta
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Celebração + compartilhar (goal_achieved) */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setCelebrating(null)}
          >
            <motion.div
              className="w-full max-w-sm space-y-3" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-center text-primary font-display text-2xl">Meta batida! 🎯</p>
              <ShareableCard
                contentType="goal_achieved"
                title={celebrating.titulo}
                subtitle={`De ${celebrating.valor_inicial}${celebrating.unidade} para ${celebrating.valor_meta}${celebrating.unidade}`}
                stat={{ label: "RESULTADO", value: `${celebrating.valor_atual}${celebrating.unidade}` }}
              />
              <button onClick={() => setCelebrating(null)} className="w-full rounded-full border border-white/15 py-2.5 text-xs text-muted-foreground">
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

