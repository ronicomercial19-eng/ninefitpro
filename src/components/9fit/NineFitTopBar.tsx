import { Bell, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function NineFitTopBar() {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-30 pt-safe bg-background/70 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between px-4 h-12">
        <button
          onClick={() => navigate("/9fit/profile")}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center text-foreground hover:text-primary transition"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate("/9fit/hub")}
          className="flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary glow-neon" />
          <span className="text-[11px] font-display tracking-[0.4em] text-foreground uppercase">
            Fit OS
          </span>
        </button>
        <button
          onClick={() => navigate("/9fit/mensagens")}
          className="relative w-9 h-9 -mr-2 rounded-full flex items-center justify-center text-foreground hover:text-primary transition"
          aria-label="Notificações"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary glow-neon" />
        </button>
      </div>
    </div>
  );
}
