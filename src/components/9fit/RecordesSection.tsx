import { useMemo, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { triggerPersonalRecordToast } from "./PersonalRecordToast";

/** Catálogo de testes por categoria — base para o fluxo de novo recorde. */
export const CATEGORIAS: Record<string, { teste: string; unidade: string }[]> = {
  forca: [
    { teste: "Supino Reto (1RM)", unidade: "kg" },
    { teste: "Agachamento (1RM)", unidade: "kg" },
    { teste: "Levantamento Terra (1RM)", unidade: "kg" },
    { teste: "Puxada Alta (1RM)", unidade: "kg" },
    { teste: "Desenvolvimento (1RM)", unidade: "kg" },
  ],
  resistencia: [
    { teste: "Cooper 12 min", unidade: "m" },
    { teste: "Corrida 5 km", unidade: "min" },
    { teste: "Prancha isométrica", unidade: "s" },
    { teste: "Flexões máximas", unidade: "reps" },
  ],
  velocidade: [
    { teste: "Sprint 20 m", unidade: "s" },
    { teste: "Sprint 40 m", unidade: "s" },
    { teste: "Salto vertical", unidade: "cm" },
  ],
  flexibilidade: [
    { teste: "Sentar e alcançar", unidade: "cm" },
    { teste: "Mobilidade de ombro", unidade: "cm" },
    { teste: "Agachamento profundo (ADM)", unidade: "graus" },
  ],
};

const LABEL: Record<string, string> = {
  forca: "Força",
  resistencia: "Resistência",
  velocidade: "Velocidade",
  flexibilidade: "Flexibilidade",
};

interface RecordeResponse { ok?: boolean; error?: string }

/**
 * Ação de registrar novo recorde (botão + modal).
 * Restaurado a partir da versão original — agora SOMENTE a ação de criar,
 * sem lista própria: a listagem de recordes já é feita pela tela de
 * Progresso via fn_get_ron_progresso_screen. Ao salvar, chama onSaved
 * para a tela recarregar a lista.
 */
export function RecordesSection({
  athleteId,
  onSaved,
}: {
  athleteId?: string | null;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState<keyof typeof CATEGORIAS>("forca");
  const [teste, setTeste] = useState(CATEGORIAS.forca[0].teste);
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);

  const unidade = useMemo(
    () => CATEGORIAS[categoria].find((t) => t.teste === teste)?.unidade ?? "",
    [categoria, teste],
  );

  const salvar = async () => {
    const v = Number(String(valor).replace(",", "."));
    if (!athleteId || !teste || !Number.isFinite(v) || v <= 0) {
      toast.error("Informe um resultado válido.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("fn_registrar_recorde", {
        p_athlete_id: athleteId,
        p_categoria: categoria,
        p_teste: teste,
        p_valor: v,
        p_unidade: unidade,
      });
      if (error) throw error;
      const result = data as RecordeResponse | null;
      if (!result?.ok) throw new Error(result?.error || "Falha ao registrar");
      toast.success("Recorde registrado");
      triggerPersonalRecordToast({
        exerciseName: teste,
        newValue: v,
        unit: unidade,
      });
      setOpen(false);
      setValor("");
      onSaved?.();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar o recorde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] uppercase tracking-widest text-primary border border-primary/40 rounded-full px-3 py-1.5"
      >
        <Plus className="w-3 h-3" /> Novo recorde
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-background p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-display text-xl">Inserir novo recorde</p>
              <button onClick={() => setOpen(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <label className="text-[10px] uppercase tracking-widest text-muted-foreground">Categoria</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.keys(CATEGORIAS).map((c) => (
                <button
                  key={c}
                  onClick={() => { const nextCategoria = c as keyof typeof CATEGORIAS; setCategoria(nextCategoria); setTeste(CATEGORIAS[nextCategoria][0].teste); }}
                  className={`py-2.5 rounded-xl text-xs font-semibold border ${
                    categoria === c ? "border-primary text-primary bg-primary/10" : "border-white/10 text-muted-foreground"
                  }`}
                >
                  {LABEL[c]}
                </button>
              ))}
            </div>

            <label className="block mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Teste</label>
            <select
              value={teste}
              onChange={(e) => setTeste(e.target.value)}
              className="w-full mt-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {CATEGORIAS[categoria].map((t) => (
                <option key={t.teste} value={t.teste} className="bg-background">{t.teste}</option>
              ))}
            </select>

            <label className="block mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">
              Resultado ({unidade})
            </label>
            <input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={`ex: 100 ${unidade}`}
              className="w-full mt-2 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary"
            />

            <button
              onClick={salvar}
              disabled={saving}
              className="mt-5 w-full rounded-full bg-primary text-primary-foreground py-3 font-bold uppercase tracking-widest text-sm disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar recorde
            </button>
          </div>
        </div>
      )}
    </>
  );
}

