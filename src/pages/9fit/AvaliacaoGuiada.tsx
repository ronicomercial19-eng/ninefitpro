import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { toast } from 'sonner';

const bodyFields = [['p_peso', 'Peso', 'kg'], ['p_gordura_corporal', 'Gordura corporal', '%'], ['p_massa_muscular', 'Massa muscular', 'kg']] as const;
const strengthFields = [['p_rm_supino', 'Supino', 'kg'], ['p_rm_agachamento', 'Agachamento', 'kg'], ['p_rm_puxada', 'Puxada', 'kg']] as const;
const fields = [...bodyFields, ...strengthFields];
type Field = typeof fields[number][0];

export default function NineFitAvaliacaoGuiada() {
  const { athleteId, loading, error: athleteError } = useAthleteId();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(today);
  const [values, setValues] = useState<Record<Field, string>>({ p_peso: '', p_gordura_corporal: '', p_massa_muscular: '', p_rm_supino: '', p_rm_agachamento: '', p_rm_puxada: '' });
  const [errors, setErrors] = useState<Partial<Record<Field | 'date' | 'form', string>>>({});
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!athleteId || saving) return;
    const nextErrors: typeof errors = {};
    const measures: Partial<Record<Field, number>> = {};
    for (const [key] of fields) {
      const raw = values[key].trim();
      if (!raw) continue;
      const value = Number(raw.replace(',', '.'));
      if (!Number.isFinite(value) || (key === 'p_peso' && (value <= 0 || value > 700)) || (key === 'p_gordura_corporal' && (value < 0 || value > 80)) || (!['p_peso', 'p_gordura_corporal'].includes(key) && value < 0)) {
        nextErrors[key] = key === 'p_peso' ? 'Informe um peso maior que 0 e até 700 kg.' : key === 'p_gordura_corporal' ? 'Use um percentual entre 0 e 80.' : 'Informe um número igual ou maior que zero.';
      } else measures[key] = value;
    }
    if (!date || date > today) nextErrors.date = 'Escolha uma data até hoje.';
    if (!Object.keys(measures).length && !Object.keys(nextErrors).length) nextErrors.form = 'Informe ao menos uma medida realmente avaliada.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('fn_salvar_avaliacao_guiada', { p_athlete_id: athleteId, p_data_avaliacao: date, ...measures });
      if (error || !(data as { success?: boolean } | null)?.success) throw error || new Error('A avaliação não foi salva.');
      window.dispatchEvent(new Event('9fit:sync_updated'));
      window.dispatchEvent(new Event('9fit:profile-updated'));
      toast.success('Avaliação registrada');
      navigate('/9fit/progresso');
    } catch (error: unknown) {
      const failure = error as { code?: string; message?: string };
      toast.error(failure.code === '42501' || /not authorized/i.test(failure.message || '') ? 'Sem permissão para este perfil. Entre novamente.' : failure.message || 'Não foi possível salvar a avaliação.');
    } finally { setSaving(false); }
  }

  const renderFields = (section: readonly (readonly [Field, string, string])[]) => section.map(([key, label, unit]) => <label key={key} className="block text-sm font-medium">{label} <span className="text-muted-foreground">({unit})</span><input aria-label={`${label} (${unit})`} aria-invalid={!!errors[key]} inputMode="decimal" value={values[key]} onChange={event => { setValues(current => ({ ...current, [key]: event.target.value })); setErrors(current => ({ ...current, [key]: undefined, form: undefined })); }} className={`mt-1 block w-full rounded-xl border bg-card p-3 outline-none focus:ring-2 focus:ring-primary/40 ${errors[key] ? 'border-destructive' : 'border-border'}`} />{errors[key] && <span className="mt-1 block text-xs text-destructive">{errors[key]}</span>}</label>);

  return <main className="min-h-screen bg-background p-4 pb-28"><div className="mx-auto max-w-lg"><p className="text-xs font-mono uppercase tracking-widest text-primary">9FIT · Avaliação guiada</p><h1 className="mt-2 text-2xl font-bold">Sua avaliação física</h1><p className="mt-2 text-sm text-muted-foreground">Preencha só o que você realmente mediu. Campos em branco não entram no cálculo.</p><div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">Autoavaliação. Não substitui a avaliação oficial com seu professor.</div>
    {loading ? <p className="mt-6 text-sm text-muted-foreground">Localizando seu perfil de atleta…</p> : !athleteId ? <div className="mt-6 rounded-xl border border-border p-4 text-sm"><p>Não encontramos um perfil de atleta vinculado à sua conta.</p><p className="mt-1 text-muted-foreground">{athleteError || 'Entre novamente ou procure seu professor para ativar o perfil.'}</p></div> : <form onSubmit={save} className="mt-6 space-y-5"><label className="block text-sm font-medium">Data da avaliação<input type="date" value={date} max={today} aria-invalid={!!errors.date} onChange={event => { setDate(event.target.value); setErrors(current => ({ ...current, date: undefined })); }} className={`mt-1 block w-full rounded-xl border bg-card p-3 ${errors.date ? 'border-destructive' : 'border-border'}`} />{errors.date && <span className="mt-1 block text-xs text-destructive">{errors.date}</span>}</label><section className="space-y-4 rounded-2xl border border-border bg-card/50 p-4"><h2 className="font-semibold">Composição corporal</h2>{renderFields(bodyFields)}</section><section className="space-y-4 rounded-2xl border border-border bg-card/50 p-4"><div><h2 className="font-semibold">Força — carga máxima em 1 repetição</h2><p className="text-xs text-muted-foreground">Informe apenas testes de 1RM que você realizou.</p></div>{renderFields(strengthFields)}</section>{errors.form && <p role="alert" className="text-xs text-destructive">{errors.form}</p>}<button disabled={saving} className="w-full rounded-xl bg-primary p-3 font-bold text-primary-foreground disabled:opacity-50">{saving ? 'Salvando…' : 'Registrar avaliação'}</button></form>}
  </div><BottomNavigation /></main>;
}
