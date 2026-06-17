import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Play, Loader2, Dumbbell, Lock } from "lucide-react";
import { toast } from "sonner";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface WeeklyTrainingViewProps {
  athleteId: string;
  onExecuteToday: (workout: any) => void;
}

type DayPlan = {
  index: number;
  weekday: number;
  name: string;
  focus: string[];
  exercises: Array<{ id?: string; name: string; sets?: string; reps?: string; video_url?: string | null }>;
  isToday: boolean;
};

/**
 * Bloco 4.3 — Treinos da Semana.
 * Lê planos_de_treino_gerados + vw_athlete_periodizacao_ativa, monta grid D1-D7,
 * busca vídeos em library_items (fase atual) com fallback para exercises.video_url,
 * permite execução apenas no dia atual.
 */
export function WeeklyTrainingView({ athleteId, onExecuteToday }: WeeklyTrainingViewProps) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<DayPlan[]>([]);
  const [phaseCategory, setPhaseCategory] = useState<string>("");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState({ goal: "", days: 4, equipment: "" });

  const todayWeekday = new Date().getDay();

  const loadWeek = async () => {
    setLoading(true);
    try {
      // 1. Periodização ativa (para fase atual)
      const { data: peri } = await supabase
        .from("vw_athlete_periodizacao_ativa" as any)
        .select("plan_name, mesocycle, macrocycle")
        .eq("athlete_id", athleteId)
        .maybeSingle();
      const cat = (peri as any)?.mesocycle?.[0]?.type
        || (peri as any)?.mesocycle?.[0]?.focus
        || "hipertrofia";
      setPhaseCategory(String(cat).toLowerCase());

      // 2. Plano de treino ativo
      const { data: plano } = await supabase
        .from("planos_de_treino_gerados" as any)
        .select("*")
        .eq("athlete_id", athleteId)
        .eq("status", "active")
        .maybeSingle();

      const rawDays: any[] = (plano as any)?.plano_json?.dias
        || (plano as any)?.training_data?.days
        || (plano as any)?.dados?.dias
        || [];

      // 3. Buscar vídeos da fase atual em library_items
      const { data: libVideos } = await supabase
        .from("library_items" as any)
        .select("name, category, player_url, thumbnail_url")
        .eq("type", "videos")
        .ilike("category", `%${cat}%`)
        .limit(50);

      const videoByName = new Map<string, string>();
      (libVideos as any[] || []).forEach((v) => {
        if (v?.name && v?.player_url) videoByName.set(String(v.name).toLowerCase(), v.player_url);
      });

      // 4. Para cada exercício, fallback para exercises.video_url
      const allExNames = rawDays.flatMap((d: any) => (d.exercicios || d.exercises || []).map((e: any) => e.nome || e.name));
      const { data: dbEx } = await supabase
        .from("exercises")
        .select("id, name, video_url, gif_url")
        .in("name", allExNames.length ? allExNames : ["__none__"]);
      const videoByEx = new Map<string, string>();
      (dbEx as any[] || []).forEach((e) => {
        if (e?.name && (e.video_url || e.gif_url)) videoByEx.set(String(e.name).toLowerCase(), e.video_url || e.gif_url);
      });

      const built: DayPlan[] = (rawDays.length ? rawDays : Array.from({ length: 7 }, (_, i) => ({ dia: i + 1 }))).map((d: any, idx: number) => {
        const wd = (idx + 1) % 7; // D1 = segunda
        const exercises = (d.exercicios || d.exercises || []).map((e: any) => ({
          id: e.id,
          name: e.nome || e.name || "Exercício",
          sets: e.series || e.sets,
          reps: e.reps || e.repeticoes,
          video_url: videoByName.get(String(e.nome || e.name || "").toLowerCase())
            || videoByEx.get(String(e.nome || e.name || "").toLowerCase())
            || e.video_url || null,
        }));
        return {
          index: idx + 1,
          weekday: wd,
          name: d.nome || d.name || d.workout_name || `Dia ${idx + 1}`,
          focus: d.grupos || d.muscle_groups || d.focus || [],
          exercises,
          isToday: wd === todayWeekday,
        };
      });

      setDays(built);
    } catch (e) {
      console.error("[WeeklyTrainingView]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!athleteId) return;
    loadWeek();
    // realtime: novos planos
    const ch = supabase.channel(`weekly-${athleteId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "planos_de_treino_gerados", filter: `athlete_id=eq.${athleteId}` }, loadWeek)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  // Carregar preferências salvas
  useEffect(() => {
    if (!athleteId) return;
    supabase.from("athletes").select("preferences").eq("id", athleteId).maybeSingle()
      .then(({ data }) => {
        const p = (data as any)?.preferences || {};
        if (p.goal || p.days || p.equipment) setPrefs({ goal: p.goal || "", days: p.days || 4, equipment: p.equipment || "" });
      });
  }, [athleteId]);

  const savePrefs = async () => {
    await supabase.from("athletes").update({ preferences: prefs as any } as any).eq("id", athleteId);
    toast.success("Preferências salvas");
    setPrefsOpen(false);
    loadWeek();
  };

  const today = useMemo(() => days.find((d) => d.isToday), [days]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Treinos da Semana</p>
          <p className="text-xs text-muted-foreground">
            Fase atual: <span className="text-foreground font-semibold">{phaseCategory || "—"}</span>
          </p>
        </div>
        <button onClick={() => setPrefsOpen((v) => !v)}
          className="text-[10px] uppercase tracking-widest text-primary border border-primary/40 rounded-full px-3 py-1">
          Preferências
        </button>
      </div>

      {prefsOpen && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 space-y-3">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Objetivo</label>
            <input value={prefs.goal} onChange={(e) => setPrefs({ ...prefs, goal: e.target.value })}
              placeholder="hipertrofia / emagrecimento / performance"
              className="w-full mt-1 bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Dias por semana</label>
            <input type="number" min={1} max={7} value={prefs.days}
              onChange={(e) => setPrefs({ ...prefs, days: Number(e.target.value) })}
              className="w-full mt-1 bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Equipamento</label>
            <input value={prefs.equipment} onChange={(e) => setPrefs({ ...prefs, equipment: e.target.value })}
              placeholder="academia / casa / livre"
              className="w-full mt-1 bg-transparent border-b border-white/10 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <button onClick={savePrefs} className="w-full rounded-full bg-primary text-primary-foreground py-2 font-bold text-sm">
            Salvar preferências
          </button>
        </div>
      )}

      {loading && (
        <div className="py-10 flex items-center justify-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {!loading && days.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-muted-foreground text-sm">
          Nenhum plano ativo. Seu professor irá atribuir em breve.
        </div>
      )}

      {!loading && days.map((d) => (
        <div key={d.index}
          className={`rounded-2xl border p-4 ${d.isToday ? "border-primary/60 bg-primary/[0.06]" : "border-white/10 bg-white/[0.03]"}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                D{d.index} · {DAY_LABELS[d.weekday]} {d.isToday && "· HOJE"}
              </p>
              <p className="font-display text-lg">{d.name}</p>
              {d.focus?.length > 0 && (
                <p className="text-xs text-muted-foreground">{Array.isArray(d.focus) ? d.focus.join(" · ") : String(d.focus)}</p>
              )}
            </div>
            {d.isToday ? (
              <button onClick={() => onExecuteToday(d)}
                className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-bold flex items-center gap-1">
                <Play className="w-3.5 h-3.5" /> Executar
              </button>
            ) : (
              <div className="text-muted-foreground"><Lock className="w-4 h-4" /></div>
            )}
          </div>

          {d.exercises?.length > 0 && (
            <ul className="space-y-1.5 mt-3">
              {d.exercises.slice(0, 8).map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <Dumbbell className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate">{e.name}</span>
                  {(e.sets || e.reps) && (
                    <span className="text-muted-foreground">{e.sets}{e.reps ? `×${e.reps}` : ""}</span>
                  )}
                  {e.video_url && (
                    <a href={e.video_url} target="_blank" rel="noreferrer" className="text-primary">
                      <Play className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
              {d.exercises.length > 8 && (
                <li className="text-[10px] text-muted-foreground pl-5">+ {d.exercises.length - 8} exercícios</li>
              )}
            </ul>
          )}
        </div>
      ))}

      {today && (
        <p className="text-[10px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
          <Calendar className="w-3 h-3" /> Conclusão concede +100 XP via fn_award_xp
        </p>
      )}
    </div>
  );
}
