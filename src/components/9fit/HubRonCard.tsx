import { supabase } from "@/integrations/supabase/client";
import { businessDate } from '@/services/dailyContextRules';
import { toast } from "sonner";
import { Sparkles, ChevronRight, Brain, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserState } from "@/hooks/useUserState";
import { STATE_LABEL, STATE_COLOR, STATE_INSIGHT } from "@/services/adaptiveState";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
import { useTiltCard } from "@/hooks/useTiltCard";
import { useEffect, useState, useRef } from 'react';
import { motion,AnimatePresence } from 'framer-motion';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useRonResultCards } from '@/hooks/useRonResultCards';
import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';

interface Props {
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  name?: string;
}

export function HubRonCard({ syncScore, scoreStatus, name }: Props) {
  const navigate = useNavigate();
  const { state, reasoning } = useUserState();
  const insights = STATE_INSIGHT[state];
  const reliable = scoreStatus === "available" && syncScore !== null;
  const color = reliable ? STATE_COLOR[state] || '#FF6600' : '#FF6600';
  const {athleteId}=useAthleteId();
  const results=useRonResultCards(athleteId);
  const waterBusy=useRef(false);
  async function logWater(){if(!athleteId||waterBusy.current)return;waterBusy.current=true;try{const {error}=await supabase.from("hydration_logs").insert({athlete_id:athleteId,log_date:businessDate(),amount_ml:500}).select("id").single();if(error)throw error;["9fit:hydration-updated","9fit:water-updated","9fit:sync_updated"].forEach(event=>window.dispatchEvent(new Event(event)));toast.success("500 ml de água registrados");}catch{toast.error("Não foi possível registrar a água.");}finally{waterBusy.current=false;}}
  const [index,setIndex]=useState(0),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[manualPause,setManualPause]=useState(false),[calibration,setCalibration]=useState(false);
  useEffect(()=>{setIndex(0);setCalibration(false);},[athleteId]);
  const insight = reliable
    ? insights[Math.abs(Math.round(syncScore)) % insights.length] ?? insights[0]
    : scoreStatus === "stale"
    ? "Seus sinais precisam de nova leitura para calibrar o plano de hoje."
    : scoreStatus === "offline"
    ? "Sem conexão agora. Modo offline mantendo a rotina segura."
    : "Sua leitura diária ainda precisa de dados.";
  const slides=[{id:'today',title:insight,description:reliable ? reasoning||'Consulte o RON para interpretar os sinais registrados.' : scoreStatus==='stale'?'Atualize a calibração para uma nova leitura.':'Complete a calibração diária para orientar o próximo passo.',action:reliable?'Consultar RON':'Calibrar meu dia',route:'/9fit/ron'},...results.cards];
  const selected=slides[Math.min(index,slides.length-1)];
  useEffect(()=>{setIndex(i=>Math.min(i,slides.length-1));},[slides.length]);
  useEffect(()=>{if(hovered||focused||manualPause||calibration||slides.length<2)return;const timer=window.setInterval(()=>{if(!document.hidden)setIndex(i=>(i+1)%slides.length);},20000);return()=>window.clearInterval(timer);},[hovered,focused,manualPause,calibration,slides.length]);

  const tiltRef = useTiltCard<HTMLButtonElement>({
    haloColor: `${color}45`,
    maxTilt: 5,
    scale: 1.012,
  });

  return (
    <div
      ref={tiltRef as any}
      role="button"
      tabIndex={0}
      onClick={() => navigate(selected.route)}
      onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();navigate(selected.route);}}}
      onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      onFocusCapture={()=>setFocused(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setFocused(false);}}
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
              RON IA · {reliable?STATE_LABEL[state]:'LEITURA DO DIA'}
            </span>

            <span className="flex items-center gap-1 text-[10px] font-mono text-[#FF6600]">
              <Sparkles className="w-3 h-3 text-[#FF6600]" />
              RON IA
            </span>

            <span className="flex items-center gap-1 text-[10px] font-mono text-neutral-400">
              <Zap className="w-3 h-3 text-[#FF6600]" />
              {!reliable
                ? scoreStatus === "offline" ? "Offline" : "Atualizar leitura"
                : `${Math.round(syncScore)}% sync`}
            </span>
          </div>

          <AnimatePresence mode="wait"><motion.div key={selected.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.25}} className="min-h-[100px]">
            <p className="font-display text-base sm:text-lg font-semibold leading-snug text-white">{name?`${name}, `:''}{selected.title}</p>
            <p className="text-sm text-neutral-400 mt-2 leading-relaxed">{selected.description}</p>
            <button type="button" className="mt-3 text-xs font-semibold text-primary" onClick={e=>{e.stopPropagation();if(selected.id==='today'&&!reliable)setCalibration(true);else navigate(selected.route);}}>{selected.action} →</button>
          </motion.div></AnimatePresence>
          <div className="mt-3 flex items-center justify-between gap-2" onClick={e=>e.stopPropagation()}>
            <button aria-label="Resultado anterior" className="p-2 text-primary" onClick={()=>setIndex(i=>(i-1+slides.length)%slides.length)}>‹</button><span className="text-xs text-neutral-400">{Math.min(index,slides.length-1)+1}/{slides.length} · a cada 20s</span><button aria-label={manualPause?'Retomar apresentações':'Pausar apresentações'} className="text-xs text-primary" onClick={()=>setManualPause(p=>!p)}>{manualPause?'Retomar':'Pausar'}</button><button aria-label="Próximo resultado" className="p-2 text-primary" onClick={()=>setIndex(i=>(i+1)%slides.length)}>›</button>
          </div>
          {results.failed&&<button className="text-xs text-neutral-400" onClick={e=>{e.stopPropagation();void results.refresh();}}>Resultados indisponíveis · tentar novamente</button>}

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
                void logWater();
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
      <div onClick={e=>e.stopPropagation()}><Dialog open={calibration} onOpenChange={setCalibration}><DialogContent><DialogHeader><DialogTitle>Calibração diária</DialogTitle></DialogHeader><EmojiCalibrationQuiz onComplete={()=>{setCalibration(false);window.dispatchEvent(new Event('9fit:sync_updated'));}}/></DialogContent></Dialog></div>
    </div>
  );
}
