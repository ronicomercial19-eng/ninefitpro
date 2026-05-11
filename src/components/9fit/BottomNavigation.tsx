import { Cpu, Dumbbell, LayoutGrid, Users, ShoppingBag } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Cpu, label: "OS", path: "/9fit/os" },
  { icon: Dumbbell, label: "TRAIN", path: "/9fit/train" },
  { icon: LayoutGrid, label: "HUB", path: "/9fit/hub", center: true },
  { icon: Users, label: "STAFF", path: "/9fit/staff" },
  { icon: ShoppingBag, label: "STORE", path: "/9fit/store" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 pb-safe">
      <div className="mx-auto max-w-md glass-mission rounded-full">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ icon: Icon, label, path, center }) => {
            const isActive =
              location.pathname === path ||
              (path === "/9fit/hub" && location.pathname === "/9fit");
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 h-full transition-all duration-300 relative ${
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {center ? (
                  <div className={`w-11 h-11 -mt-4 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-[0_0_24px_hsla(20,100%,50%,0.6)]"
                      : "bg-card border border-primary/30 text-primary"
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_hsl(var(--neon-400))]" : ""}`} />
                )}
                <span className="text-[9px] font-display uppercase tracking-[0.2em] mt-0.5">{label}</span>
                {isActive && !center && (
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
