import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HUDBar } from "@/components/9fit/HUDBar";
import { MissionCard } from "@/components/9fit/MissionCard";
import { AppGrid } from "@/components/9fit/AppGrid";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

export default function NineFitHub() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [mission, setMission] = useState<any>(null);

  // Mock data - would come from API
  const stats = {
    level: 12,
    xp: 750,
    maxXp: 1000,
    streak: 7,
  };

  useEffect(() => {
    // Simulate AI generating mission
    const timer = setTimeout(() => {
      setMission({
        title: "Complete 20 Min HIIT",
        description:
          "Based on your goal of fat loss and current fitness level, a high-intensity interval session will maximize caloric burn while preserving muscle mass.",
        xpReward: 150,
        type: "workout",
      });
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HUD Bar */}
      <HUDBar
        level={stats.level}
        xp={stats.xp}
        maxXp={stats.maxXp}
        streak={stats.streak}
      />

      {/* Date Header */}
      <div className="px-4 py-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-foreground">
            9FIT
          </h1>
          <span className="text-xl font-bold text-neon-400">PRO</span>
        </div>
        <p className="text-muted-foreground text-xs uppercase tracking-[0.2em] font-bold mt-1">
          Sistema Operacional
        </p>
      </div>

      {/* Mission Card */}
      <div className="px-4 mb-8">
        <MissionCard
          mission={mission}
          isLoading={isLoading}
          onComplete={() => {
            // Update XP, show celebration, etc.
          }}
        />
      </div>

      {/* App Grid */}
      <AppGrid />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
