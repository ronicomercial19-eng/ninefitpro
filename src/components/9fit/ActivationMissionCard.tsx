import { motion } from 'framer-motion';
import { Rocket, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActivationFlow } from '@/hooks/useActivationFlow';

/**
 * Card único de ativação. Enquanto `finished_at` for null, exibe CTA
 * para retomar o fluxo unificado em /9fit/ativacao.
 */
export function ActivationMissionCard() {
  const navigate = useNavigate();
  const { row, loading } = useActivationFlow();

  if (loading) return null;
  if (row?.finished_at) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/9fit/ativacao')}
      className="w-full text-left relative rounded-2xl p-5 bg-gradient-to-br from-primary/[0.14] via-card/60 to-card/40 border border-primary/30 backdrop-blur-xl overflow-hidden hover:border-primary/50 transition"
    >
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] tracking-[0.3em] uppercase text-primary font-black">Ativação em andamento</p>
          <p className="text-sm font-semibold mt-0.5">Continue seu fluxo guiado</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Termine para liberar o app oficialmente</p>
        </div>
        <ChevronRight className="w-5 h-5 text-primary shrink-0" />
      </div>
    </motion.button>
  );
}
