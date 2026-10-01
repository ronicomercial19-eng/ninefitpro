import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useActivationFlow } from '@/hooks/useActivationFlow';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { toast } from 'sonner';

const fields = [
  ['p_peso','Peso (kg)'], ['p_gordura_corporal','Gordura corporal (%)'], ['p_massa_muscular','Massa muscular (kg)'],
  ['p_rm_supino','Carga avaliada no supino (kg)'], ['p_rm_agachamento','Carga avaliada no agachamento (kg)'], ['p_rm_puxada','Carga avaliada na puxada (kg)'],
] as const;
export default function NineFitAvaliacaoGuiada() {
  const { athleteId } = useAthleteId();
  const { advanceStep } = useActivationFlow();
  const navigate = useNavigate();
  const [values, setValues] = useState<Record<string,string>>({});
  const [goal,setGoal] = useState('Hipertrofia e Definição');
  const [level,setLevel] = useState('Iniciante');
  const [frequency,setFrequency] = useState(3);
  const [restrictions,setRestrictions] = useState('');
  const [saving,setSaving] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!athleteId || saving) return;
    const measures: Record<string,number> = {};
    for (const [key] of fields) {
      const raw=values[key]?.trim(); if (!raw) continue;
      const value=Number(raw.replace(',', '.'));
      if (!Number.isFinite(value) || value<0 || (key==='p_peso' && (value<=0 || value>700)) || (key==='p_gordura_corporal' && value>80)) return toast.error('Revise os valores da avaliação');
      measures[key]=value;
    }
    if (!Object.keys(measures).length) return toast.error('Informe ao menos uma medida real da avaliação');
    setSaving(true);
    try {
      const {data,error}=await supabase.rpc('fn_salvar_avaliacao_guiada',{p_athlete_id:athleteId,p_data_avaliacao:format(new Date(),'yyyy-MM-dd'),...measures});
      if(error || !(data as any)?.success) throw error || new Error('A avaliação não foi salva');
      const advanced=await advanceStep('assessment',{goal,experience_level:level,weekly_frequency:frequency,restrictions});
      window.dispatchEvent(new Event('9fit:sync_updated'));
      window.dispatchEvent(new Event('9fit:profile-updated'));
      if(!advanced) { toast.error('Medidas salvas. Revise a conexão para finalizar a ficha de treino.'); return; }
      toast.success('Avaliação salva e perfil de treino atualizado'); navigate('/9fit/ativacao');
    } catch(error:any) { toast.error(error.message || 'Não foi possível salvar a avaliação'); }
    finally { setSaving(false); }
  }
  return <main className="min-h-screen bg-background p-4 pb-28"><h1 className="text-2xl font-bold mb-2">Avaliação física</h1><p className="text-sm text-muted-foreground mb-6">Registre as medidas obtidas na sua avaliação. Deixe em branco o que não foi medido.</p>
    <form onSubmit={save} className="space-y-4 max-w-lg mx-auto">
      {fields.map(([key,label])=><label key={key} className="block text-sm">{label}<input aria-label={label} inputMode="decimal" value={values[key] || ''} onChange={e=>setValues(v=>({...v,[key]:e.target.value}))} className="block w-full mt-1 rounded-xl border border-border bg-card p-3" /></label>)}
      <label className="block">Objetivo<select value={goal} onChange={e=>setGoal(e.target.value)} className="block w-full bg-card p-3 rounded-xl">{['Hipertrofia e Definição','Emagrecimento','Força','Saúde e Bem-estar'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="block">Experiência<select value={level} onChange={e=>setLevel(e.target.value)} className="block w-full bg-card p-3 rounded-xl">{['Iniciante','Intermediário','Avançado'].map(v=><option key={v}>{v}</option>)}</select></label>
      <label className="block">Treinos por semana<input type="number" min={1} max={7} value={frequency} onChange={e=>setFrequency(Number(e.target.value))} required className="block w-full bg-card p-3 rounded-xl" /></label>
      <label className="block">Restrições informadas<textarea value={restrictions} onChange={e=>setRestrictions(e.target.value)} className="block w-full bg-card p-3 rounded-xl" /></label>
      <button disabled={saving || !athleteId} className="w-full rounded-xl bg-primary text-primary-foreground p-3 font-bold disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar avaliação e continuar'}</button>
    </form><BottomNavigation /></main>;
}
