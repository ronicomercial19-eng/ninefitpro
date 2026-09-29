import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { motion } from "framer-motion";
import { Activity, Brain, Crown, Dna, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrimeState } from "@/hooks/usePrimeState";

export default function NineFitPrimePass() {
  const { user } = useAuth();
  const { biomarkers, macros } = usePrimeState();

  if (!user) return null;

  return (
    <div className="min-h-screen gradient-mission pb-28">
      <div className="px-4 pt-6 pb-3">
        <p className="text-[10px] font-data tracking-[0.4em] text-primary/80">9FIT // PRIME PASS</p>
        <h1 className="text-massive text-4xl text-foreground mt-1">PRIME PASS</h1>
      </div>

      <div className="px-4 mb-4 grid grid-cols-2 gap-3">
        <Pillar icon={Dna} label="Assinatura" tag="Ativa" />
        <Pillar icon={Zap} label="Performance" tag={`Testo: ${biomarkers?.testosterone || '---'} ng/dL`} />
        <Pillar icon={Brain} label="Recuperação" tag={`Cortisol: ${biomarkers?.cortisol || '---'} ug/dL`} />
        <Pillar icon={Activity} label="Protocolo" tag={`Proteína: ${macros?.protein || '---'}g`} />
      </div>

      <div className="px-4 mb-4">
        <div className="w-full glass-mission rounded-xl p-4 flex items-center justify-between glass-mission-active">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5 text-primary" />
            <div className="text-left">
              <p className="text-editorial text-base text-foreground">Status Prime</p>
              <p className="text-[10px] font-data text-muted-foreground">Sistema Sincronizado</p>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
      </div>

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
