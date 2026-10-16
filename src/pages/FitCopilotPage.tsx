import React, { useEffect, useRef, useState } from 'react';
import { Bot, Brain, Users, ArrowRight } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

type Athlete = { id: string; name: string; primary_goal: string | null };
type Recommendation = { title: string; description: string; category: string; priority: string };

export default function FitCopilotPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const athleteId = new URLSearchParams(location.search).get('athleteId');
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [athleteLoading, setAthleteLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  useEffect(() => {
    let active = true;
    requestVersion.current += 1;
    setAthlete(null);
    setAthleteLoading(false);
    setGenerating(false);
    setRecommendations([]);
    setError('');
    if (!athleteId) return () => { active = false; };
    setAthleteLoading(true);
    void (async () => {
      try {
        const { data, error: athleteError } = await supabase.from('athletes').select('id,name,primary_goal').eq('id', athleteId).maybeSingle();
        if (!active) return;
        if (athleteError || !data) setError('Aluno indisponível ou sem acesso. Selecione outro aluno.');
        else setAthlete(data);
      } catch { if (active) setError('Não foi possível consultar o aluno.'); }
      finally { if (active) setAthleteLoading(false); }
    })();
    return () => { active = false; };
  }, [athleteId]);

  const generate = async () => {
    if (!athlete || generating) return;
    const version = ++requestVersion.current;
    setGenerating(true);
    setError('');
    setRecommendations([]);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('ai-coach', {
        body: { mode: 'recommendations', data: { athleteId: athlete.id, name: athlete.name, goal: athlete.primary_goal } },
      });
      if (invokeError || data?.success !== true || !Array.isArray(data?.data?.recommendations)) throw invokeError ?? new Error('Resposta inválida');
      if (version === requestVersion.current) setRecommendations(data.data.recommendations);
    } catch {
      if (version === requestVersion.current) setError('Não foi possível gerar recomendações agora. Tente novamente.');
    } finally {
      if (version === requestVersion.current) setGenerating(false);
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">FitCopilot</h1>
          <p className="text-sm text-muted-foreground">Copiloto inteligente de treino via API</p>
        </div>
      </div>
      <section className="rounded-xl border border-border bg-card p-5 space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Recomendações para o aluno em foco</h2><p className="mt-1 text-sm text-muted-foreground">{athlete ? `${athlete.name} · ${athlete.primary_goal || 'objetivo não informado'}` : athleteLoading ? 'Carregando aluno…' : 'Selecione um aluno no cabeçalho para começar.'}</p></div>
          <button type="button" onClick={() => void generate()} disabled={!athlete || generating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{generating ? 'Analisando…' : 'Gerar recomendações'}</button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {recommendations.length > 0 && <div className="grid gap-3 md:grid-cols-2">{recommendations.map((item, index) => <article key={`${item.title}-${index}`} className="rounded-lg border border-border bg-background p-4"><div className="flex justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="text-xs text-primary">{item.priority}</span></div><p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{item.category}</p><p className="mt-2 text-sm text-muted-foreground">{item.description}</p></article>)}</div>}
        {recommendations.length > 0 && <p className="text-xs text-muted-foreground">Sugestões para revisão profissional. Para alterar a prescrição, abra os ajustes ou a ficha do aluno.</p>}
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <button onClick={() => navigate(`/app/ron${location.search}`)} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Bot className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Abrir cockpit RON</p><p className="text-xs text-muted-foreground mt-1">Analise progresso e receba recomendações contextuais.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate(`/app/ajustes-treino${location.search}`)} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Brain className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Revisar ajustes de treino</p><p className="text-xs text-muted-foreground mt-1">Veja e aplique ajustes inteligentes pendentes.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate(`/app/alunos${location.search}`)} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Users className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Escolher aluno</p><p className="text-xs text-muted-foreground mt-1">Abra o perfil para consultar histórico e prescrição.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
      </section>
      <ApiConnectorCard
        moduleKey="fit_copilot"
        title="FitCopilot API"
        description="Monitoramento em tempo real, ajustes de carga e detecção de padrões."
        icon={Bot}
        endpointPlaceholder="https://api.fitcopilot.example.com/v1"
      />
    </div>
  );
}
