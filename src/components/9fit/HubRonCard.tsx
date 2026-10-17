import { supabase } from "@/integrations/supabase/client";
import { businessDate } from '@/services/dailyContextRules';
import { toast } from "sonner";
import { Sparkles, ChevronRight, Brain, Zap, CalendarDays, Droplet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserState } from "@/hooks/useUserState";
import { STATE_LABEL, STATE_INSIGHT } from "@/services/adaptiveState";
import type { HubScoreStatus } from "@/hooks/useAthleteScores";
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

// Card "calmo" (padrão Nine Pro v2): sem glow, sem hairline, sem cor de estado.
// O foco visual da tela fica nos cards hero (Sync / Foco atual).
const chip = 'inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 font-data text-[9px] uppercase tracking-widest text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary';

export function HubRonCard({ syncScore, scoreStatus, name }: Props) {
  const navigate = useNavigate();
  const { state, reasoning } = useUserState();
  const insights = STATE_INSIGHT[state];
  const reliable = scoreStatus === "available" && syncScore !== null;
  const {athleteId}=useAthleteId();
  const results=useRonResultCards(athleteId);
  const waterBusy=useRef(false);
  async function logWater(){if(!athleteId||waterBusy.current)return;waterBusy.current=true;try{const {error}=await supabase.from("hydration_logs").insert({athlete_id:athleteId,log_date:businessDate(),amount_ml:500}).select("id").single();if(error)throw error;["9fit:hydration-updated","9fit:water-updated","9fit:sync_updated"].forEach(event=>window.dispatchEvent(new Event(event)));toast.success("500 ml de água registrados");}catch{toast.error("Não foi possível registrar a água.");}finally{waterBusy.current=false;}}
  // Sem carrossel automático: o insight do dia fica fixo e as demais leituras são navegadas manualmente.
  const [index,setIndex]=useState(0),[calibration,setCalibration]=useState(false);
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

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(selected.route)}
      onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();navigate(selected.route);}}}
      className="relative w-full cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-black/60 p-4 text-left transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">
              <Brain className="h-3 w-3" />
              RON IA · {reliable?STATE_LABEL[state]:'Leitura do dia'}
            </span>
            <span className="inline-flex items-center gap-1 font-data text-[9px] uppercase tracking-widest text-muted-foreground">
              <Zap className="h-3 w-3 text-primary" />
              {!reliable
                ? scoreStatus === "offline" ? "Offline" : "Atualizar leitura"
                : `${Math.round(syncScore)}% sync`}
            </span>
          </div>

          <AnimatePresence mode="wait"><motion.div key={selected.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.25}} className="min-h-[72px]">
            <p className="font-display text-base font-black uppercase leading-snug tracking-tight text-white">{name?`${name}, `:''}{selected.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{selected.description}</p>
            <button type="button" className="mt-3 font-display text-[11px] font-black uppercase tracking-wider text-primary" onClick={e=>{e.stopPropagation();if(selected.id==='today'&&!reliable)setCalibration(true);else navigate(selected.route);}}>{selected.action} →</button>
          </motion.div></AnimatePresence>

          {slides.length>1&&<div className="mt-3 flex items-center justify-between gap-2" onClick={e=>e.stopPropagation()}>
            <button aria-label="Resultado anterior" className="p-2 text-primary" onClick={()=>setIndex(i=>(i-1+slides.length)%slides.length)}>‹</button><span className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">{Math.min(index,slides.length-1)+1}/{slides.length}</span><button aria-label="Próximo resultado" className="p-2 text-primary" onClick={()=>setIndex(i=>(i+1)%slides.length)}>›</button>
          </div>}
          {results.failed&&<button className="text-xs text-neutral-400" onClick={e=>{e.stopPropagation();void results.refresh();}}>Resultados indisponíveis · tentar novamente</button>}

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge'));
              }}
              className={`${chip} border-primary/40 text-primary`}
            >
              <Sparkles className="h-3 w-3" />
              Concierge
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('9fit:open-ron-concierge', { detail: { prompt: "Sincronize os treinos da minha semana na minha Google Agenda" } }));
              }}
              className={chip}
            >
              <CalendarDays className="h-3 w-3" />
              Agenda
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void logWater();
              }}
              className={chip}
            >
              <Droplet className="h-3 w-3" />
              +500 ml
            </button>
          </div>
        </div>

        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-primary">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>
      <div onClick={e=>e.stopPropagation()}><Dialog open={calibration} onOpenChange={setCalibration}><DialogContent><DialogHeader><DialogTitle>Calibração diária</DialogTitle></DialogHeader><EmojiCalibrationQuiz onComplete={()=>{setCalibration(false);window.dispatchEvent(new Event('9fit:sync_updated'));}}/></DialogContent></Dialog></div>
    </div>
  );
}
