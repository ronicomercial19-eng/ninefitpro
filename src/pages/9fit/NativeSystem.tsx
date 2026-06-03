import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";

export default function NineFitNativeSystem() {
  const navigate = useNavigate();
  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-primary/30 bg-black/80">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg border border-white/10 grid place-items-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Sistema Nativo</p>
          <p className="font-display text-sm">Fitness Place</p>
        </div>
        <a href="https://fitnessplace.lovable.app" target="_blank" rel="noreferrer"
          className="w-9 h-9 rounded-lg border border-primary/40 grid place-items-center text-primary">
          <ExternalLink className="w-4 h-4" />
        </a>
      </header>
      <iframe
        src="https://fitnessplace.lovable.app"
        title="Fitness Place"
        className="flex-1 w-full border-0 bg-black"
        allow="clipboard-write; fullscreen; camera; microphone"
      />
    </div>
  );
}
