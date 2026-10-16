import React, { useEffect, useState } from 'react';
import { Calendar, ClipboardList, Users, ArrowRight } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';
import { smartPeriodizerRequest } from '@/services/smartperiodizer.service';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type ActivePlan = { plan_name: string | null; current_phase: string | null; status: string | null; current_week_index: number | null; macro_weeks: number | null; ultima_sincronizacao: string | null };
type Assignment = { id: string; training_name: string; content_type: string | null; created_at: string; is_active: boolean };

export default function SmartPeriodizer() {
  const navigate = useNavigate();
  const location = useLocation();
  const athleteId = new URLSearchParams(location.search).get('athleteId');
  const [connection, setConnection] = useState<'checking' | 'online' | 'offline'>('checking');
  const [plan, setPlan] = useState<ActivePlan | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(false);

  useEffect(() => {
    smartPeriodizerRequest({ path: '/health' })
      .then(() => setConnection('online'))
      .catch(() => setConnection('offline'));
  }, []);

  useEffect(() => {
    let active = true;
    setPlan(null);
    setAssignments([]);
    setPlanError(false);
    if (!athleteId) return () => { active = false; };
    setPlanLoading(true);
    Promise.all([
      supabase.from('vw_athlete_periodizacao_ativa').select('plan_name,current_phase,status,current_week_index,macro_weeks,ultima_sincronizacao').eq('athlete_id', athleteId).maybeSingle(),
      supabase.from('student_training_assignments').select('id,training_name,content_type,created_at,is_active').eq('student_id', athleteId).eq('training_type', 'periodization').order('created_at', { ascending: false }).limit(10),
    ]).then(([planResult, assignmentResult]) => {
      if (!active) return;
      if (planResult.error || assignmentResult.error) setPlanError(true);
      else { setPlan(planResult.data); setAssignments(assignmentResult.data ?? []); }
    }).catch(() => { if (active) setPlanError(true); }).finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, [athleteId]);

  const openTraining = (assign = false) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', 'treino');
    if (assign) params.set('action', 'assign-periodization');
    else params.delete('action');
    navigate({ pathname: '/app/alunos', search: `?${params}` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">SmartPeriodizer</h1>
          <p className="text-sm text-muted-foreground">Periodização inteligente via API</p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${connection === 'online' ? 'bg-emerald-500' : connection === 'offline' ? 'bg-destructive' : 'bg-amber-500 animate-pulse'}`} />
        {connection === 'online' ? 'Contrato SmartPeriodizer conectado' : connection === 'offline' ? 'Contrato SmartPeriodizer indisponível' : 'Verificando contrato SmartPeriodizer…'}
      </div>
      <section className="rounded-xl border border-border bg-card p-5" aria-live="polite">
        <h2 className="font-semibold">Plano do aluno em foco</h2>
        {!athleteId ? <p className="mt-2 text-sm text-muted-foreground">Selecione um aluno no cabeçalho para consultar ciclos e periodizações atribuídas.</p>
          : planLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando planejamento…</p>
          : planError ? <p className="mt-2 text-sm text-destructive">Não foi possível consultar o planejamento deste aluno.</p>
          : <div className="mt-3 space-y-3 text-sm">
            {plan ? <div><p className="font-medium">{plan.plan_name || 'Plano sem nome'} · {plan.current_phase || 'Fase não informada'}</p><p className="text-muted-foreground">{plan.current_week_index ? `Semana ${plan.current_week_index}${plan.macro_weeks ? ` de ${plan.macro_weeks}` : ''}` : 'Semana não informada'} · {plan.status || 'Status não informado'}</p>{plan.ultima_sincronizacao && <p className="text-xs text-muted-foreground">Última sincronização: {new Date(plan.ultima_sincronizacao).toLocaleString('pt-BR')}</p>}</div> : <p className="text-muted-foreground">Nenhum ciclo ativo encontrado.</p>}
            {assignments.length > 0 && <div><p className="font-medium">Periodizações atribuídas</p><ul className="mt-1 space-y-1">{assignments.map(item => <li key={item.id} className="text-muted-foreground">{item.training_name} · {item.content_type || 'modelo'} · {item.is_active ? 'ativa' : 'inativa'}</li>)}</ul></div>}
          </div>}
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <button onClick={() => navigate(`/app/alunos${location.search}`)} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Users className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Selecionar aluno</p><p className="text-xs text-muted-foreground mt-1">Abra o perfil do aluno para atribuir ou revisar uma periodização.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => openTraining(true)} disabled={!athleteId} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition disabled:opacity-50">
          <ClipboardList className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Atribuir periodização</p><p className="text-xs text-muted-foreground mt-1">Use modelos, PDF ou HTML no cadastro do aluno.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate(`/app/estatisticas${location.search}`)} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Calendar className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Acompanhar ciclos</p><p className="text-xs text-muted-foreground mt-1">Leia aderência, carga e evolução dos ciclos ativos.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
      </section>
      <ApiConnectorCard
        moduleKey="smart_periodizer"
        title="SmartPeriodizer API"
        description="Conecte para gerar periodizações automatizadas (volume, intensidade, recuperação)."
        icon={Calendar}
        endpointPlaceholder="https://api.smartperiodizer.example.com/v1"
      />
    </div>
  );
}
