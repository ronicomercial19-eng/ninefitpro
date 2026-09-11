import { useState } from "react";
import { AchievementShareSheet, type Achievement } from "@/components/9fit/AchievementShareSheet";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";

const templates = [
  { type: "sync_score", label: "Sync Score", kicker: "MEU PROGRESSO", title: "Evolução no 9FIT PRO", subtitle: "Consistência registrada no seu perfil" },
  { type: "personal_record", label: "Recorde pessoal", kicker: "NOVO RECORDE", title: "Meu recorde no 9FIT PRO", subtitle: "Carga e performance em evolução" },
  { type: "workout_completed", label: "Treino concluído", kicker: "TREINO CONCLUÍDO", title: "Mais uma sessão entregue", subtitle: "Consistência vence intensidade" },
  { type: "assessment_completed", label: "Avaliação", kicker: "AVALIAÇÃO CONCLUÍDA", title: "Meu check-in de performance", subtitle: "Dados reais, evolução contínua" },
  { type: "weekly_recap", label: "Resumo semanal", kicker: "RECAP DA SEMANA", title: "Minha semana 9FIT", subtitle: "Veja minha consistência" },
  { type: "goal_achieved", label: "Meta alcançada", kicker: "META ALCANÇADA", title: "Objetivo concluído", subtitle: "Um passo a mais na jornada" },
  { type: "level_up", label: "Level up", kicker: "LEVEL UP", title: "Subi de nível", subtitle: "Minha evolução continua" },
] as const;

export default function NineFitCompartilhar() {
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  return (
    <div className="min-h-screen bg-background pb-28 p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary">9FIT PRO</p>
      <h1 className="mt-2 text-3xl font-display">Moldes de compartilhamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">Escolha o tipo de conquista e gere seu card para Stories.</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <button key={template.type} type="button" onClick={() => setAchievement({ contentType: template.type, kicker: template.kicker, title: template.title, subtitle: template.subtitle })} className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-left hover:bg-primary/[0.12]">
            <p className="font-semibold">{template.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{template.subtitle}</p>
          </button>
        ))}
      </div>
      <AchievementShareSheet achievement={achievement} onClose={() => setAchievement(null)} />
      <BottomNavigation />
    </div>
  );
}