import { Home, Dumbbell, User, CalendarCheck } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Início", path: "/9fit/hub" },
  { icon: Dumbbell, label: "Treinos", path: "/9fit/train" },
  { icon: CalendarCheck, label: "Aulas", path: "/9fit/aulas-creditos" },
  { icon: User, label: "Perfil", path: "/9fit/profile" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path || 
            (path === "/9fit/hub" && location.pathname === "/9fit");
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200 relative ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "animate-scale-in" : ""}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
