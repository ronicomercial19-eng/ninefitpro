import { useEffect, useState } from "react";
import { format } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Utensils, X } from "lucide-react";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useNutritionToday } from "@/hooks/useNutritionToday";
import { NutritionTodaySummary } from "./NutritionTodaySummary";

/**
 * Cabeçalho compacto "Sua alimentação hoje".
 * Fechado: resumo curto. Ao tocar, abre splash com o conteúdo completo (registro de refeição, água, histórico, dieta).
 */
export function NutritionCompactCard() {
  const { athleteId } = useAthleteId();
  const data = useNutritionToday(athleteId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!athleteId) return null;

  const subtitle = data.loading
    ? "Carregando…"
    : data.error
    ? "Leitura indisponível · toque para tentar de novo"
    : data.diet?.diet_name || "Sem plano alimentar ativo";
  const kcal = Math.round(data.totals.calories);
  const goalText = data.goals.calories ? `de ${data.goals.calories} kcal` : "sem meta prescrita";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Sua alimentação hoje"
        className="w-full text-left relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#161720] via-[#0e0f14] to-[#08080b] p-4 shadow-xl shadow-black/60 group cursor-pointer active:scale-[0.99] transition-transform"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--orange-400)] to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-3">
          <div className="orange-matte w-11 h-11 rounded-xl flex items-center justify-center shrink-0">
            <Utensils className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-mono tracking-[0.25em] font-bold uppercase text-[var(--orange-300)]">
              Alimentação do dia
            </p>
            <h3 className="text-base font-bold text-white font-display leading-tight">Sua alimentação hoje</h3>
            <p className="text-[11px] text-neutral-400 truncate">
              {subtitle}
              {data.updatedAt && !data.error && !data.loading ? ` · atualizado às ${format(data.updatedAt, "HH:mm")}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white tabular-nums">{data.loading || data.error ? "—" : `${kcal} kcal`}</p>
            <p className="text-[9px] font-mono text-neutral-400 uppercase">{goalText}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--orange-400)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#090909] p-5 shadow-2xl shadow-black my-auto"
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--orange-400)] to-transparent opacity-80" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="absolute top-4 right-4 w-8 h-8 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="pr-10">
                <NutritionTodaySummary interactive />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
