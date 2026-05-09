import { Home, Dumbbell, Sparkles, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "OS", path: "/9fit/hub" },
  { icon: Dumbbell, label: "TRAIN", path: "/9fit/train" },
  { icon: Sparkles, label: "HUB", path: "/9fit/community" },
  { icon: Users, label: "STAFF", path: "/9fit/staff" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 pb-safe">
      <div className="mx-auto max-w-md glass rounded-full backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around h-14 px-2">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive =
              location.pathname === path ||
              (path === "/9fit/hub" && location.pathname === "/9fit");
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center gap-0.5 px-4 h-full transition-all duration-300 relative ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--neon-400))]" : ""}`} />
                <span className="text-[9px] font-display uppercase tracking-[0.2em]">{label}</span>
                {isActive && (
                  <div className="absolute -top-1 w-1 h-1 rounded-full bg-primary glow-neon" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
