import { useState } from "react";
import { Scale, Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAthleteId } from "@/hooks/useAthleteId";
import { toast } from "sonner";

/**
 * Auto-registro do aluno entre avaliações oficiais do professor.
 * Grava via fn_registrar_peso_avulso(p_athlete_id, p_peso, p_data, p_gordura) —
 * função validada no dossiê "Ponte Progress Tracker ↔ FitPro" (13/09), que
 * insere em avaliacoes_unificadas com origem='peso_avulso' e já entra
 * automaticamente na Tendência e no histórico consumidos por
 * fn_get_ron_progresso_screen.
 * QA (14/09): %gordura era gravado com um UPDATE direto na tabela depois do
 * insert, mas não existe policy de UPDATE pra atleta em avaliacoes_unificadas
 * — a RLS bloqueava silenciosamente e o campo nunca era salvo de fato.
 * Corrigido: p_gordura agora é parâmetro da própria função SECURITY DEFINER,
 * gravado no mesmo INSERT.
 */
export function CheckinCorporalCard({ onSaved }: { onSaved?: () => void }) {
  const { athleteId } = useAthleteId();
  const [open, setOpen] = useState(false);
  const [peso, setPeso] = useState("");
  const [gordura, setGordura] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!athleteId || !peso) {
      toast.error("Informe pelo menos o peso");
      return;
    }
    setSaving(true);

    const { error } = await supabase.rpc("fn_registrar_peso_avulso" as any, {
      p_athlete_id: athleteId,
      p_peso: Number(peso),
      p_gordura: gordura ? Number(gordura) : null,
    });

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar check-in");
      return;
    }

    toast.success("Check-in registrado");
    setOpen(false);
    setPeso(""); setGordura("");
    onSaved?.();
  };

  return (
    <div className="px-4 mt-4">
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-white/15 p-3.5 flex items-center justify-center gap-2 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition"
      >
        <Scale className="w-3.5 h-3.5" /> Registrar meu peso hoje (entre avaliações)
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-primary/30 bg-background p-5 pb-8 sm:pb-5 space-y-3"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-display text-lg flex items-center gap-2"><Scale className="w-4 h-4 text-primary" /> Auto-registro corporal</p>
              <p className="text-[11px] text-muted-foreground">
                Isso não substitui a avaliação oficial com seu professor — é só um acompanhamento seu entre uma avaliação e outra.
              </p>
              <input
                type="number" placeholder="Peso hoje (kg)" value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
              />
              <input
                type="number" placeholder="% de gordura (opcional, se tiver balança)" value={gordura}
                onChange={(e) => setGordura(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm"
              />
              <button
                onClick={submit} disabled={saving}
                className="w-full rounded-full bg-primary text-primary-foreground py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> {saving ? "Salvando…" : "Salvar check-in"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
