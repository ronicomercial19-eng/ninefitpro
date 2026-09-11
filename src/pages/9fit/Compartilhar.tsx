import { useEffect, useState } from "react";
import { AchievementShareSheet, type Achievement } from "@/components/9fit/AchievementShareSheet";
import { BottomNavigation } from "@/components/9fit/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const templates = [
  { type: "sync_score", label: "Sync Score", kicker: "MEU PROGRESSO", title: "Minha evolução no 9FIT PRO", subtitle: "Consistência registrada no seu perfil" },
  { type: "personal_record", label: "Recorde pessoal", kicker: "NOVO RECORDE", title: "Meu recorde no 9FIT PRO", subtitle: "Performance em evolução" },
  { type: "workout_completed", label: "Treino concluído", kicker: "TREINO CONCLUÍDO", title: "Mais uma sessão entregue", subtitle: "Consistência vence intensidade" },
  { type: "assessment_completed", label: "Avaliação", kicker: "AVALIAÇÃO CONCLUÍDA", title: "Meu check-in de performance", subtitle: "Dados reais, evolução contínua" },
  { type: "weekly_recap", label: "Resumo semanal", kicker: "RECAP DA SEMANA", title: "Minha semana 9FIT", subtitle: "Veja minha consistência" },
  { type: "goal_achieved", label: "Meta alcançada", kicker: "META ALCANÇADA", title: "Objetivo concluído", subtitle: "Um passo a mais na jornada" },
  { type: "level_up", label: "Level up", kicker: "LEVEL UP", title: "Subi de nível", subtitle: "Minha evolução continua" },
] as const;

export default function NineFitCompartilhar() {
  const { user } = useAuth();
  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ name: "Aluno 9FIT", score: null as number | null, workouts: 0, record: null as string | null });

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: athleteData } = await supabase.from("athletes" as any).select("id,name,sync_score").eq("user_id", user.id).maybeSingle();
      const athlete = athleteData as any;
      if (!athlete?.id) { setLoading(false); return; }
      const [{ data: executions }, { data: records }] = await Promise.all([
        supabase.from("workout_executions" as any).select("id").eq("athlete_id", athlete.id).eq("status", "completed"),
        supabase.from("personal_records" as any).select("exercicio,valor,unidade").eq("athlete_id", athlete.id).order("data_pr", { ascending: false }).limit(1),
      ]);
      const latest = records?.[0] as any;
      setStats({ name: athlete.name || "Aluno 9FIT", score: athlete.sync_score == null ? null : Number(athlete.sync_score), workouts: executions?.length || 0, record: latest ? String(latest.exercicio) + " · " + String(latest.valor) + String(latest.unidade || "kg") : null });
      setLoading(false);
    })();
  }, [user?.id]);

  const openTemplate = (template: (typeof templates)[number]) => setAchievement({
    contentType: template.type, kicker: template.kicker, title: template.title,
    value: template.type === "sync_score" && stats.score != null ? String(stats.score) + "%" : template.type === "personal_record" && stats.record ? stats.record : template.type === "workout_completed" ? String(stats.workouts) + " treinos concluídos" : undefined,
    subtitle: template.subtitle + " · " + stats.name,
  });

  return (
    <div className="min-h-screen bg-background pb-28 p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-primary">9FIT PRO</p>
      <h1 className="mt-2 text-3xl font-display">Moldes de compartilhamento</h1>
      <p className="mt-2 text-sm text-muted-foreground">Cards personalizados com seus dados reais.</p>
      {loading ? <div className="mt-8 flex justify-center"><Loader2 className="animate-spin" /></div> : <>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm"><p className="font-semibold">{stats.name}</p><p className="mt-1 text-muted-foreground">Sync Score: {stats.score == null ? "—" : stats.score + "%"} · Treinos concluídos: {stats.workouts}</p>{stats.record && <p className="mt-1 text-muted-foreground">Último recorde: {stats.record}</p>}</div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{templates.map((template) => <button key={template.type} type="button" onClick={() => openTemplate(template)} className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4 text-left hover:bg-primary/[0.12]"><p className="font-semibold">{template.label}</p><p className="mt-1 text-xs text-muted-foreground">{template.subtitle}</p><span className="mt-3 inline-block text-xs font-semibold text-primary">Criar e compartilhar →</span></button>)}</div>
      </>}
      <AchievementShareSheet achievement={achievement} onClose={() => setAchievement(null)} />
      <BottomNavigation />
    </div>
  );
}