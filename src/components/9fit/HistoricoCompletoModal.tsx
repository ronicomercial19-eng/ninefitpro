import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Dumbbell, Trophy, ClipboardCheck, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TimelineEvent {
  event_date: string;
  event_type: "assessment" | "workout" | "pr" | string;
  title: string;
  detail: {
    score_global?: number | null;
    peso?: number | null;
    gordura_corporal?: number | null;
    origem?: string | null;
    total_volume_kg?: number | null;
    valor?: number | string | null;
    unidade?: string | null;
  };
}

const ICONS: Record<string, JSX.Element> = {
  assessment: <ClipboardCheck className="w-4 h-4" />,
  workout: <Dumbbell className="w-4 h-4" />,
  pr: <Trophy className="w-4 h-4" />,
};

function describe(ev: TimelineEvent): string {
  if (ev.event_type === "assessment") {
    const parts: string[] = [];
    if (ev.detail?.score_global != null) parts.push(`score ${Math.round(ev.detail.score_global)}%`);
    if (ev.detail?.peso != null) parts.push(`${ev.detail.peso}kg`);
    if (ev.detail?.gordura_corporal != null) parts.push(`${ev.detail.gordura_corporal}% gordura`);
    return parts.join(" · ") || (ev.detail?.origem === "peso_avulso" ? "Auto-registro" : "Avaliação com professor");
  }
  if (ev.event_type === "workout") {
    return ev.detail?.total_volume_kg != null ? `Volume total: ${ev.detail.total_volume_kg}kg` : "";
  }
  if (ev.event_type === "pr") {
    return `${ev.detail?.valor}${ev.detail?.unidade || "kg"}`;
  }
  return "";
}

/**
 * "Ver histórico completo" — consome fn_get_athlete_timeline(athlete_id, limit),
 * peça auxiliar que já existia pronta no dossiê "Ponte Progress Tracker ↔
 * FitPro" mas não estava ligada a nenhum botão. QA (14/09) achou que essa
 * função tinha o mesmo gap de autorização das outras duas e corrigiu antes de
 * expor este botão (ver fitpro.md).
 */
export function HistoricoCompletoModal({ athleteId }: { athleteId: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = async () => {
    if (!athleteId) return;
    setOpen(true);
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.rpc("fn_get_athlete_timeline", {
      p_athlete_id: athleteId,
      p_limit: 40,
    });

    if (error) {
      console.error("[HistoricoCompletoModal] fn_get_athlete_timeline falhou:", error);
      setErrorMsg("Não foi possível carregar o histórico agora.");
      setEvents([]);
    } else {
      setEvents((data as TimelineEvent[]) || []);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={load}
        className="mx-4 mt-3 w-[calc(100%-2rem)] rounded-2xl border border-white/10 bg-white/[0.03] py-3 flex items-center justify-center gap-2 text-sm text-foreground/80 hover:border-primary/40 hover:text-primary transition"
      >
        <History className="w-4 h-4" /> Ver histórico completo
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-sm max-h-[80vh] rounded-t-3xl sm:rounded-3xl border border-primary/30 bg-background p-5 flex flex-col"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-lg flex items-center gap-2"><History className="w-4 h-4 text-primary" /> Histórico completo</p>
                <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                {loading && <p className="text-xs text-muted-foreground text-center py-6">Carregando…</p>}
                {!loading && errorMsg && <p className="text-xs text-destructive text-center py-6">{errorMsg}</p>}
                {!loading && !errorMsg && events.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-6">Nenhum evento registrado ainda.</p>
                )}
                {!loading && events.map((ev, i) => (
                  <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-start gap-3">
                    <div className="mt-0.5 text-primary">{ICONS[ev.event_type] || <History className="w-4 h-4" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{ev.title}</p>
                        <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(ev.event_date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{describe(ev)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

