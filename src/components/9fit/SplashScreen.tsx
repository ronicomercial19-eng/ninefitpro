import { Activity } from "lucide-react";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export function SplashScreen({ onComplete, duration = 3000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Glow Effect */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-64 h-64 bg-neon-400/5 rounded-full blur-[80px] animate-pulse-slow" />
      </div>

      {/* Logo */}
      <div className="relative flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <Activity className="w-16 h-16 text-neon-400 animate-pulse" />
          <div className="absolute inset-0 w-16 h-16 bg-neon-400/20 rounded-full blur-xl" />
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-black italic tracking-tighter text-foreground">
            9FIT
          </h1>
          <span className="text-2xl font-bold text-neon-400 tracking-wider">
            PRO
          </span>
        </div>

        <p className="text-xs text-gray-600 tracking-widest uppercase animate-slide-up">
          System Initializing
        </p>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-20 flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 bg-neon-400 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
