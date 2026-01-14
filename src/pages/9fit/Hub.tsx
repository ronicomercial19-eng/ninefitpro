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

  // Dados - seria obtido via API/wearables ou entrada manual
  const stats = {
    calories: 320,
    caloriesGoal: 500,
    streak: 7,
  };

  useEffect(() => {
    // Simular geração de missão pela IA
    const timer = setTimeout(() => {
      setMission({
        title: "Complete 20 Min HIIT",
        description:
          "Baseado no seu objetivo de perda de gordura e nível de condicionamento atual, uma sessão de alta intensidade vai maximizar a queima calórica enquanto preserva massa muscular.",
        caloriesReward: 150,
        type: "treino",
      });
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* HUD Bar */}
      <HUDBar
        calories={stats.calories}
        caloriesGoal={stats.caloriesGoal}
        streak={stats.streak}
      />

      {/* Date Header */}
      <div className="px-4 py-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-foreground">
            9FIT
          </h1>
          <span className="text-xl font-bold text-primary">PRO</span>
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
            // Atualizar calorias, mostrar celebração, etc.
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
