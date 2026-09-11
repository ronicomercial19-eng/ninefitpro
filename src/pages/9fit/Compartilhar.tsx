import { useState } from "react";
import { AchievementShareSheet, type Achievement } from "@/components/9fit/AchievementShareSheet";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

export default function NineFitCompartilhar() {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  return (
    <div className="min-h-screen bg-background pb-28 p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary">9FIT PRO</p>
      <h1 className="mt-2 text-3xl font-display">Compartilhar progresso</h1>
      <p className="mt-2 text-sm text-muted-foreground">Gere seu card de progresso e compartilhe nos Stories.</p>
      <button type="button" onClick={() => setAchievement({ contentType: "sync_score", kicker: "MEU PROGRESSO", title: "Evolução no 9FIT PRO", subtitle: "Consistência registrada no seu perfil" })} className="mt-8 w-full rounded-2xl bg-primary py-3 font-semibold text-primary-foreground">Criar card para compartilhar</button>
      <AchievementShareSheet achievement={achievement} onClose={() => setAchievement(null)} />
      <BottomNavigation />
    </div>
  );
}