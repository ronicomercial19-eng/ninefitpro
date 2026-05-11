import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { motion } from "framer-motion";
import { Activity, Brain, Crown, Dna, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";

type State = "DIAGNOSTIC" | "READY" | "UPGRADING";

export default function NineFitPrimePass() {
  const [state, setState] = useState<State>("DIAGNOSTIC");

  useEffect(() => {
    const t = setTimeout(() => setState("READY"), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // PRIMEPASS</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">ELITE PANEL</h1>
      </div>

      {state === "DIAGNOSTIC" && (
        <div className="px-4">
          <div className="glass-mission rounded-xl p-6 flex flex-col items-center text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-full border-2 border-primary border-t-transparent mb-4"
            />
            <p className="text-[10px] font-data tracking-[0.3em] text-primary mb-2">[DIAGNOSTIC]</p>
            <p className="text-sm text-foreground">Sincronizando DNA...</p>
            <p className="text-xs text-muted-foreground mt-1">Scanner holográfico ativo</p>
          </div>
        </div>
      )}

      {state === "READY" && (
        <>
          <div className="px-4 mb-4 grid grid-cols-2 gap-3">
            <Pillar icon={Dna} label="Genética" tag="Decodificado" />
            <Pillar icon={Zap} label="Performance" tag="Otimizado" />
            <Pillar icon={Brain} label="Longevidade" tag="Estável" />
            <Pillar icon={Activity} label="Bio-Hacking" tag="Ativo" />
          </div>

          <div className="px-4 mb-4">
            <button
              onClick={() => setState("UPGRADING")}
              className="w-full glass-mission glass-mission-active rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <p className="text-editorial text-base text-foreground">Upgrade Elite</p>
                  <p className="text-[10px] font-data text-muted-foreground">Acesso completo ao protocolo</p>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-primary" />
            </button>
          </div>
        </>
      )}

      {state === "UPGRADING" && (
        <div className="px-4">
          <div className="glass-mission glass-mission-active rounded-xl p-6 flex flex-col items-center text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.4, repeat: Infinity }}
              className="w-12 h-12 rounded-full bg-primary mb-3"
            />
            <p className="text-[10px] font-data tracking-[0.3em] text-primary">[UPGRADING]</p>
            <p className="text-sm text-foreground mt-2">Sincronizando DNA…</p>
            <button
              onClick={() => setState("READY")}
              className="mt-4 text-xs text-muted-foreground underline"
            >
              cancelar
            </button>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

function Pillar({ icon: Icon, label, tag }: any) {
  return (
    <div className="glass-mission rounded-xl p-4">
      <Icon className="w-5 h-5 text-primary mb-2" />
      <p className="text-editorial text-sm text-foreground">{label}</p>
      <p className="text-[9px] font-data tracking-widest text-muted-foreground mt-1 uppercase">{tag}</p>
    </div>
  );
}
