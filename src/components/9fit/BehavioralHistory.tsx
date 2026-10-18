import { useEffect, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Dumbbell, Utensils, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';

type HistoryKind = 'treino' | 'nutricao';
type Day = { date: string; label: string; count: number; minutes: number; calories: number; protein: number; carbs: number; fat: number };

// Padrão Nine Pro v2: número-foco no topo, gráfico monocromático laranja, controles calmos.
const ORANGE = 'hsl(20 100% 50%)';

export function BehavioralHistory() {
  const { athleteId, loading } = useAthleteId();
  const [selected, setSelected] = useState<HistoryKind | null>(null);
  const [days, setDays] = useState<Day[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const events = ['9fit:workout-updated', '9fit:nutrition-updated'];
    events.forEach(event => window.addEventListener(event, refresh));
    return () => events.forEach(event => window.removeEventListener(event, refresh));
  }, []);

  useEffect(() => {
    let active = true;
    setDays([]);
    setError(false);
    if (!selected || !athleteId) { setBusy(false); return; }
    setBusy(true);
    const today = new Date();
    const range: Day[] = Array.from({ length: 30 }, (_, index) => {
      const day = subDays(today, 29 - index);
      return { date: format(day, 'yyyy-MM-dd'), label: format(day, 'dd/MM'), count: 0, minutes: 0, calories: 0, protein: 0, carbs: 0, fat: 0 };
    });
    const byDate = new Map(range.map(day => [day.date, day]));
    async function load() {
      try {
        if (selected === 'treino') {
          const result = await supabase.from('workout_executions').select('workout_date,duration_minutes').eq('athlete_id', athleteId!).eq('status', 'completed').gte('workout_date', range[0].date).lte('workout_date', range[29].date);
          if (result.error) throw result.error;
          for (const row of result.data || []) {
            const day = row.workout_date ? byDate.get(row.workout_date) : undefined;
            if (day) { day.count += 1; day.minutes += Number(row.duration_minutes || 0); }
          }
        } else {
          const result = await supabase.from('nutrition_logs').select('date,calories,protein,carbs,fat').eq('athlete_id', athleteId!).gte('date', range[0].date).lte('date', range[29].date);
          if (result.error) throw result.error;
          for (const row of result.data || []) {
            const day = row.date ? byDate.get(row.date) : undefined;
            if (day) {
              day.count += 1;
              day.calories += Number(row.calories || 0);
              day.protein += Number(row.protein || 0);
              day.carbs += Number(row.carbs || 0);
              day.fat += Number(row.fat || 0);
            }
          }
        }
        if (active) setDays(range);
      } catch { if (active) setError(true); }
      finally { if (active) setBusy(false); }
    }
    void load();
    return () => { active = false; };
  }, [selected, athleteId, revision]);

  const total = days.reduce((sum, day) => ({ count: sum.count + day.count, minutes: sum.minutes + day.minutes, calories: sum.calories + day.calories }), { count: 0, minutes: 0, calories: 0 });
  const training = selected === 'treino';
  const ready = !!selected && !busy && !loading && !!athleteId && !error;
  const heroValue = ready ? (training ? total.count : Math.round(total.calories)) : '—';
  const heroUnit = !selected ? 'escolha um histórico' : training ? 'treinos concluídos' : 'kcal registradas';
  return <section className="space-y-4" aria-label="Histórico comportamental">
    <div>
      <p className="font-data text-[9px] uppercase tracking-[0.3em] text-primary/80">Histórico · últimos 30 dias</p>
      <p className="mt-1 font-display text-5xl font-black leading-none tracking-tighter text-foreground">{heroValue}<span className="ml-1.5 font-data text-[10px] uppercase tracking-widest text-primary">{heroUnit}</span></p>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {([{ kind: 'treino', label: 'Treino', Icon: Dumbbell }, { kind: 'nutricao', label: 'Nutrição', Icon: Utensils }] as const).map(({ kind, label, Icon }) => <button key={kind} type="button" aria-pressed={selected === kind} onClick={() => setSelected(kind)} className={`rounded-xl border p-3 text-left transition-colors active:scale-95 ${selected === kind ? 'border-primary/60 bg-primary/10' : 'border-white/10 bg-white/[0.03] hover:border-primary/40'}`}>
        <Icon className="mb-2 h-4 w-4 text-primary" /><strong className="block font-display text-sm font-black uppercase tracking-tight text-foreground">{label}</strong><span className="font-data text-[9px] uppercase tracking-widest text-muted-foreground">Ver histórico →</span>
      </button>)}
    </div>
    {selected && <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3" aria-live="polite">
      <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 font-data text-[9px] uppercase tracking-widest text-muted-foreground"><ArrowLeft className="h-3 w-3" /> Voltar</button>
      <div>
        <h4 className="font-display text-sm font-black uppercase tracking-tight text-foreground">Histórico de {training ? 'treino' : 'nutrição'}</h4>
        <p className="text-xs text-muted-foreground">{training ? 'Sessões concluídas por dia' : 'Calorias registradas por dia'}</p>
      </div>
      {busy || loading ? <p className="text-xs text-muted-foreground">Carregando histórico…</p> : !athleteId ? <p className="text-xs text-muted-foreground">Vincule seu perfil de atleta para consultar o histórico.</p> : error ? <div><p className="text-xs text-foreground">Não foi possível carregar o histórico.</p><button type="button" onClick={() => setRevision(value => value + 1)} className="mt-2 font-data text-[10px] uppercase tracking-widest text-primary">Tentar novamente</button></div> : total.count === 0 ? <p className="text-xs text-muted-foreground">Nenhum {training ? 'treino concluído' : 'registro de refeição'} neste período.</p> : <>
        <p className="font-data text-[10px] uppercase tracking-widest text-muted-foreground">{total.count} {training ? 'treinos' : 'refeições'} · {Math.round(training ? total.minutes : total.calories)} {training ? 'min registrados' : 'kcal registradas'}</p>
        <div className="h-52 w-full" role="img" aria-label={training ? 'Gráfico de treinos concluídos por dia' : 'Gráfico de calorias registradas por dia'}>
          <ResponsiveContainer width="100%" height="100%"><BarChart data={days} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid stroke="#ffffff12" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#a3a3a3', fontSize: 10 }} minTickGap={25} /><YAxis width={40} allowDecimals={!training} tick={{ fill: '#a3a3a3', fontSize: 10 }} />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={({ active, payload }) => {
              const day = payload?.[0]?.payload as Day | undefined;
              return active && day ? <div className="rounded-xl border border-primary/30 bg-black p-2 text-xs"><strong className="font-data text-[10px] uppercase tracking-widest text-primary">{day.label}</strong><p>{day.count} {training ? 'treinos' : 'refeições'}</p>{training ? <p>{Math.round(day.minutes)} min registrados</p> : <><p>{Math.round(day.calories)} kcal</p><p>Proteína {Math.round(day.protein)} g</p><p>Carboidratos {Math.round(day.carbs)} g</p><p>Gorduras {Math.round(day.fat)} g</p></>}</div> : null;
            }} /><Bar dataKey={training ? 'count' : 'calories'} fill={ORANGE} radius={[3, 3, 0, 0]} />
          </BarChart></ResponsiveContainer>
        </div>
      </>}
    </div>}
  </section>;
}
