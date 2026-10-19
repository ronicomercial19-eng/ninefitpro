import React, { useEffect, useState } from 'react';
import { Calendar, ClipboardList, Users, ArrowRight } from 'lucide-react';
import { ApiConnectorCard } from '@/components/admin/ApiConnectorCard';
import { smartPeriodizerRequest } from '@/services/smartperiodizer.service';
import { useNavigate } from 'react-router-dom';

export default function SmartPeriodizer() {
  const navigate = useNavigate();
  const [connection, setConnection] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    smartPeriodizerRequest({ path: '/health' })
      .then(() => setConnection('online'))
      .catch(() => setConnection('offline'));
  }, []);

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
      <section className="grid gap-4 md:grid-cols-3">
        <button onClick={() => navigate('/app/alunos')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <Users className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Selecionar aluno</p><p className="text-xs text-muted-foreground mt-1">Abra o perfil do aluno para atribuir ou revisar uma periodização.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate('/app/alunos')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
          <ClipboardList className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">Atribuir periodização</p><p className="text-xs text-muted-foreground mt-1">Use modelos, PDF ou HTML no cadastro do aluno.</p><ArrowRight className="w-4 h-4 text-primary mt-4" />
        </button>
        <button onClick={() => navigate('/app/estatisticas')} className="rounded-xl border border-border bg-card p-5 text-left hover:border-primary/60 transition">
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
