import { useState } from 'react';
import { useDailyContext } from '@/hooks/useDailyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PDIWizard } from './PDIWizard';

const names: Record<string, string> = { goal: 'Objetivo', recovery_rate: 'Recuperação declarada', volume_tolerance: 'Tolerância a volume', peak_window: 'Horário preferido', stress_sensitivity: 'Sensibilidade ao estresse', discomfort_tolerance: 'Desconforto', time_horizon: 'Horizonte em semanas', injury_zones: 'Histórico de lesões', dietary_restrictions: 'Restrições alimentares' };
const labels: Record<string, string> = { morning: 'Manhã', afternoon: 'Tarde', night: 'Noite', performance: 'Performance', aesthetics: 'Estética', longevity: 'Longevidade', recomposition: 'Recomposição', fast: 'Rápida', medium: 'Média', slow: 'Lenta', moderate: 'Moderada', conservative: 'Conservadora', aggressive: 'Alta', knee: 'Joelho', shoulder: 'Ombro', back: 'Costas', elbow: 'Cotovelo', ankle: 'Tornozelo', hip: 'Quadril', vegan: 'Vegana', vegetarian: 'Vegetariana', lactose: 'Lactose', gluten: 'Glúten' };
function display(value: unknown): string { if (Array.isArray(value)) return value.length ? value.map(display).join(', ') : 'Nenhuma declarada'; return labels[String(value)] || String(value); }

export function DynamicPDI() {
  const context = useDailyContext();
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const profile = context.data?.profile;
  const savePreference = async (patch: Record<string, unknown>, declared?: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('fn_save_pdi' as any, { p_patch: declared || {}, p_preferences: patch });
      if (error) throw error;
      window.dispatchEvent(new Event('9fit:profile-updated'));
      toast.success('Preferência salva na sua ficha');
    } catch { toast.error('Não foi possível salvar sua preferência.'); } finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 space-y-4" aria-label="Minha ficha dinâmica">
    <div><h2 className="font-display text-lg">Minha ficha dinâmica · PDI</h2><p className="text-xs text-muted-foreground">Você declara suas preferências. Seus registros mostram sua rotina. Sugestões só viram preferências depois da sua confirmação.</p></div>
    {context.isPending && <p role="status">Carregando sua ficha…</p>}
    {context.isError && <button onClick={() => void context.refetch()}>Não consegui ler a ficha. Tentar novamente</button>}
    {profile && <>
      <p className="text-xs text-primary">{profile.complete ? 'Perfil confirmado' : 'Confirme sua ativação inicial'} · {context.data?.streak} dias consecutivos com registros</p>
      <dl className="grid grid-cols-2 gap-3">{Object.entries(profile.declared).map(([key, value]) => <div key={key}><dt className="text-[10px] uppercase text-muted-foreground">{names[key] || key} · declarado</dt><dd className="text-sm">{display(value)}</dd></div>)}</dl>
      <button onClick={() => setEdit(true)} className="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm">{profile.complete ? 'Editar minha ficha' : 'Confirmar meu perfil'}</button>
      <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 p-3"><div><p className="text-xl font-bold">{profile.observed.active_days_30d}</p><p className="text-xs">dias ativos em 30 dias · observado</p></div><div><p className="text-xl font-bold">{profile.observed.completed_workouts_30d}</p><p className="text-xs">treinos concluídos · observado</p></div></div>
      <p className="text-xs text-muted-foreground">Em 30 dias: refeições em {profile.observed.nutrition_days_30d ?? 0} dias · água em {profile.observed.hydration_days_30d ?? 0} dias · {profile.observed.review_days_30d ?? 0} balanços registrados.</p>
      {profile.inferred.training_window && profile.inferred.training_window !== profile.declared.peak_window && <div className="rounded-xl border border-amber-400/30 p-3"><p className="text-sm">Você costuma treinar de {display(profile.inferred.training_window).toLowerCase()}. Quer adotar esse horário como preferência?</p><button disabled={busy} onClick={() => void savePreference({}, { peak_window: profile.inferred.training_window })} className="mt-2 text-primary text-sm">Confirmar horário sugerido</button><p className="mt-1 text-[10px] text-muted-foreground">Sugestão baseada nos horários de início registrados; não substitui sua escolha.</p></div>}
      <div className="space-y-3"><label className="block text-xs">Tempo habitual disponível<select disabled={busy} value={profile.preferences.session_minutes || ''} onChange={e => void savePreference({ session_minutes: Number(e.target.value) })} className="mt-1 block w-full rounded-lg border border-white/10 bg-background p-2"><option value="" disabled>Escolher</option>{[15,30,45,60,90].map(value => <option key={value} value={value}>{value} minutos</option>)}</select></label>
      <label className="block text-xs">Onde costuma treinar<select disabled={busy} value={profile.preferences.training_environment || ''} onChange={e => void savePreference({ training_environment: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/10 bg-background p-2"><option value="" disabled>Escolher</option><option value="home">Casa</option><option value="gym">Academia</option><option value="outdoors">Ar livre</option></select></label>
      <p className="text-[10px] text-muted-foreground">Essas escolhas orientam as sugestões do RON. Não alteram sua prescrição atribuída.</p></div>
    </>}
    <PDIWizard detailed open={edit} onClose={() => setEdit(false)} />
  </section>;
}
