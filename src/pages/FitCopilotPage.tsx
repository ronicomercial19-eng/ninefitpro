import React from 'react';
import { Bot, Brain, Users, ArrowRight } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';
import { useNavigate } from 'react-router-dom';

export default function FitCopilotPage() {
  const navigate = useNavigate();
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
      <section className="grid gap-4 md:grid-cols-3">
        <button onClick={() => navigate('/app/ron')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Bot className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Abrir cockpit RON</p><p className="text-xs text-muted-foreground mt-1">Analise progresso e receba recomendações contextuais.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate('/app/ajustes-treino')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Brain className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Revisar ajustes de treino</p><p className="text-xs text-muted-foreground mt-1">Veja e aplique ajustes inteligentes pendentes.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate('/app/alunos')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
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
