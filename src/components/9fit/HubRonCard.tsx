import { Sparkles, ChevronRight, Brain, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserState } from "@/hooks/useUserState";
import { STATE_LABEL, STATE_COLOR, STATE_INSIGHT } from "@/services/adaptiveState";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import { useTiltCard } from "@/hooks/useTiltCard";

interface Props {
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  name?: string;
}

export function HubRonCard({ syncScore, scoreStatus, name }: Props) {
  const navigate = useNavigate();
  const { state, reasoning } = useUserState();
  const color = STATE_COLOR[state] || "#FF6600";
  const insights = STATE_INSIGHT[state];
  const reliable = scoreStatus === "available" && syncScore !== null;
  const insight = reliable
    ? insights[Math.abs(Math.round(syncScore)) % insights.length] ?? insights[0]
    : scoreStatus === "stale"
    ? "Seus sinais precisam de nova leitura para calibrar o plano de hoje."
    : scoreStatus === "offline"
    ? "Sem conexão agora. Modo offline mantendo a rotina segura."
    : "Processando seus sinais para a leitura biométrica do seu dia.";

  const tiltRef = useTiltCard<HTMLButtonElement>({
    haloColor: `${color}45`,
    maxTilt: 5,
    scale: 1.012,
  });

  return (
    <button
      ref={tiltRef}
      type="button"
      onClick={() => navigate(`/9fit/ron?context=hub_card&state=${state}`)}
      className="w-full text-left hub-card-interactive rounded-2xl border p-4 sm:p-5 relative overflow-hidden group border-white/10 hover:border-primary/40 bg-gradient-to-r from-[#121318] via-[#0d0e12] to-[#0b0b0e] cursor-pointer shadow-xl shadow-black/60 transition-all duration-300"
      style={{
        boxShadow: `0 8px 30px -10px ${color}25`,
      }}
    >
      {/* Luz Periférica & Halo Dinâmico */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none transition-opacity duration-500 group-hover:opacity-30"
        style={{
          background: `radial-gradient(circle at 10% 20%, ${color}, transparent 65%)`,
        }}
      />

      {/* Hairline luminoso sutil com a cor de estado do Ron */}
      <div
        className="absolute top-0 left-0 right-0 h-[1.5px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        }}
      />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Header limpo e sofisticado do Mentor */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full font-bold border transition-all"
              style={{
                background: `${color}18`,
                borderColor: `${color}35`,
                color,
              }}
            >
              <Brain className="w-3 h-3" />
              RON IA · {STATE_LABEL[state]}
            </span>

            <span className="flex items-center gap-1 text-[10px] font-mono text-[#FF6600]">
              <Sparkles className="w-3 h-3 text-[#FF6600]" />
              Gemini 3.8
            </span>

            <span className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
              <Zap className="w-3 h-3 text-[#FF6600]" />
              {syncScore === null
                ? "Calibrando"
                : `${Math.round(syncScore)}% sync${scoreStatus === "stale" ? " (obs)" : ""}`}
            </span>
          </div>

          <p className="font-display text-base sm:text-lg font-semibold leading-snug text-white group-hover:text-white/95">
            {name ? `${name}, ` : ""}{insight}
          </p>

          {reasoning && (
            <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
              {reasoning}
            </p>
          )}

          {/* Atalhos Rápidos Operacionais do Concierge */}
          <div className="mt-3.5 pt-3 border-t border-white/10 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge'));
              }}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-black transition-all flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Concierge
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge', { detail: { prompt: "Sincronize os treinos da minha semana na minha Google Agenda" } }));
              }}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1"
            >
              📅 Google Agenda
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge', { detail: { prompt: "Registre 500ml de água que acabei de tomar" } }));
              }}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/5 text-neutral-300 border border-white/10 hover:bg-white/10 hover:text-white transition-all flex items-center gap-1"
            >
              💧 +500ml Água
            </button>
          </div>
        </div>

        {/* Botão de expansão tátil com halo */}
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10 group-hover:border-white/30 bg-white/[0.04] transition-all mt-0.5"
          style={{ color }}
        >
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}
