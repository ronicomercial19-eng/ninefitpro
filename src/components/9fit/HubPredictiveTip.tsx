import { Brain, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function HubPredictiveTip({ tip, context }: { tip: string; context?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/9fit/ron")}
      className="w-full surface-card p-4 flex items-start gap-3 hover:border-[hsl(var(--neural))]/30 transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "hsl(var(--neural) / 0.12)" }}>
        <Brain className="w-4 h-4" style={{ color: "hsl(var(--neural))" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-label" style={{ color: "hsl(var(--neural))" }}>RON • INSIGHT</p>
        <p className="text-sm text-foreground mt-0.5">{tip}</p>
        {context && <p className="text-[11px] text-muted-foreground mt-1">{context}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
    </button>
  );
}
