import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, ClipboardCheck } from "lucide-react";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const GUIDED_URL = "https://nineprogresstracker.lovable.app/avaliacao-guiada/select";

/**
 * Avaliação Guiada 360 — embeda o ProgressTracker via iframe.
 * Após responder o questionário, ProgressTracker grava no banco e o professor
 * pode ativar SmartTreino+Periodizer com 1 clique a partir do painel admin.
 */
export default function NineFitAvaliacaoGuiada() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-primary/30 bg-black/70 sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg border border-white/10 grid place-items-center">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold flex items-center gap-1.5">
            <ClipboardCheck className="w-3 h-3" /> Avaliação Guiada 360
          </p>
          <p className="font-display text-sm truncate">ProgressTracker</p>
        </div>
        <a href={GUIDED_URL} target="_blank" rel="noreferrer"
          className="w-9 h-9 rounded-lg border border-primary/40 grid place-items-center text-primary">
          <ExternalLink className="w-4 h-4" />
        </a>
      </header>
      <iframe
        src={GUIDED_URL}
        title="Avaliação Guiada 360"
        className="w-full border-0 bg-black"
        style={{ height: "calc(100vh - 120px)" }}
        allow="clipboard-write; fullscreen; camera"
      />
      <BottomNavigation />
    </div>
  );
}
