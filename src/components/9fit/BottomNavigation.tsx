import { Home, Dumbbell, Users, BarChart2, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Home", path: "/9fit" },
  { icon: Dumbbell, label: "Train", path: "/9fit/train" },
  { icon: Users, label: "Social", path: "/9fit/social" },
  { icon: BarChart2, label: "Stats", path: "/9fit/stats" },
  { icon: User, label: "Profile", path: "/9fit/profile" },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-lg border-t border-dark-700 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;
          
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 w-16 h-full transition-all duration-200 ${
                isActive
                  ? "text-neon-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "animate-scale-in" : ""}`} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-0.5 bg-neon-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
