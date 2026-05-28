import { Cpu, Dumbbell, LayoutGrid, Users, Globe2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Cpu, label: "OS", path: "/9fit/os" },
  { icon: Dumbbell, label: "TRAIN", path: "/9fit/train" },
  { icon: LayoutGrid, label: "HUB", path: "/9fit/hub", center: true },
  { icon: Users, label: "STAFF", path: "/9fit/staff" },
  { icon: Globe2, label: "COMMUNITY", path: "/9fit/community" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 pb-safe">
      <div className="mx-auto max-w-md surface-elevated rounded-full backdrop-blur-xl bg-card/90">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ icon: Icon, label, path, center }) => {
            const isActive =
              location.pathname === path ||
              (path === "/9fit/hub" && location.pathname === "/9fit");
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center justify-center gap-0.5 px-3 h-full transition-colors relative ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {center ? (
                  <div
                    className={`w-14 h-14 -mt-7 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-elevated border border-white/10 text-foreground"
                    }`}
                    style={{ boxShadow: "0 0 24px -4px hsl(var(--primary) / 0.4)" }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                )}
                <span className="text-[9px] font-semibold uppercase tracking-[0.14em] mt-0.5">{label}</span>
                {isActive && !center && (
                  <div className="absolute -top-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
