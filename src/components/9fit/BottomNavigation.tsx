import { Cpu, Dumbbell, Bot, LayoutGrid, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Bottom Navigation v5 — canonical FitPro structure.
 * Início (OS) · Train · Prime (destaque central) · Hub · Perfil
 */
const navItems = [
  { icon: Cpu, label: "INÍCIO", path: "/9fit/os" },
  { icon: Dumbbell, label: "TRAIN", path: "/9fit/train" },
  { icon: Bot, label: "RON", path: "/9fit/ron", center: true },
  { icon: LayoutGrid, label: "HUB", path: "/9fit/hub" },
  { icon: User, label: "PERFIL", path: "/9fit/profile" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 pb-safe">
      <div className="mx-auto max-w-md surface-elevated rounded-full backdrop-blur-xl bg-card/90">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map(({ icon: Icon, label, path, center, premium }) => {
            const isActive =
              location.pathname === path ||
              (path === "/9fit/os" && location.pathname === "/9fit") ||
              (path === "/9fit/hub" && location.pathname.startsWith("/9fit/hub"));
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
                    className={`w-14 h-14 -mt-7 rounded-full flex items-center justify-center transition-all border ${
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : premium
                        ? "bg-elevated border-primary/40 text-primary"
                        : "bg-elevated border-white/10 text-foreground"
                    }`}
                    style={{ boxShadow: "0 0 28px -6px hsl(var(--primary) / 0.55)" }}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                ) : (
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                )}
                <span
                  className={`text-[9px] font-semibold uppercase tracking-[0.14em] mt-0.5 ${
                    premium && !isActive ? "text-primary/80" : ""
                  }`}
                >
                  {label}
                </span>
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
