import { useState } from 'react';
import { Crown, Shield, Coffee, Zap, ExternalLink, RefreshCw, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { awardXP } from '@/services/engrenagem/gamificationEngine';

interface PrimeApp {
  id: string;
  name: string;
  description: string;
  icon: typeof Crown;
  status: 'ACTIVE' | 'BETA' | 'LOCKED';
  externalUrl?: string;
  embedded?: boolean;
}

const APPS: PrimeApp[] = [
  { id: 'elite', name: '9FIT ELITE', description: 'Protocolos de performance vanguardista.', icon: Crown, status: 'ACTIVE', embedded: true },
  { id: 'bio', name: '9FIT BIO', description: 'Análise DNA + biomarcadores de sangue.', icon: Shield, status: 'ACTIVE', externalUrl: 'https://bio.9fit.com' },
  { id: 'kitchen', name: '9FIT KITCHEN', description: 'Delivery de refeições e macro tracking.', icon: Coffee, status: 'ACTIVE', externalUrl: 'https://kitchen.9fit.com' },
  { id: 'recovery', name: '9FIT RECOVERY', description: 'Crioterapia e câmara hiperbárica.', icon: Zap, status: 'BETA', externalUrl: 'https://recovery.9fit.com' },
];

export function PrimePassHub({ onSelectElite }: { onSelectElite?: () => void }) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [applied, setApplied] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Record<string, string>>({});

  const handleSync = async (app: PrimeApp) => {
    setSyncing(app.id);
    await new Promise(r => setTimeout(r, 1400));
    setRecommendations(prev => ({
      ...prev,
      [app.id]: `Sincronização concluída. Protocolo de ${app.name.toLowerCase()} calibrado para sua leitura biológica atual.`,
    }));
    setSyncing(null);
    await awardXP('module_launched', {}, { moduleId: app.id });
    toast.success(`${app.name} sincronizado`);
  };

  const handleApply = async (app: PrimeApp) => {
    setApplied(prev => [...prev, app.id]);
    await awardXP('protocol_step', {}, { source: app.id });
    toast.success(`Protocolo ${app.name} aplicado`);
  };

  const handleOpen = (app: PrimeApp) => {
    if (app.embedded && onSelectElite && app.id === 'elite') {
      onSelectElite();
      return;
    }
    if (app.externalUrl) window.open(app.externalUrl, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      {APPS.map(app => {
        const Icon = app.icon;
        const isSyncing = syncing === app.id;
        const isApplied = applied.includes(app.id);
        const rec = recommendations[app.id];

        return (
          <div key={app.id} className="surface-card p-4 hover-magnetic">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-elevated flex items-center justify-center text-primary shrink-0">
                <Icon className="w-5 h-5" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-display text-base">{app.name}</p>
                  <span className={`text-[8px] font-bold tracking-widest px-1.5 py-0.5 rounded ${
                    app.status === 'ACTIVE' ? 'bg-primary/15 text-primary' :
                    app.status === 'BETA' ? 'bg-elevated text-muted-foreground' : 'bg-elevated text-muted-foreground'
                  }`}>
                    {app.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{app.description}</p>

                {rec && (
                  <div className="mt-3 p-3 rounded-lg bg-elevated border border-primary/15">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[9px] font-bold tracking-widest text-primary">RECOMENDAÇÃO</span>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed">{rec}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleOpen(app)}
                    className="flex-1 surface-elevated py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-elevated/80 transition-colors"
                  >
                    {app.embedded ? <>Abrir <ChevronRight className="w-3.5 h-3.5" /></> : <>Acessar <ExternalLink className="w-3.5 h-3.5" /></>}
                  </button>
                  <button
                    onClick={() => handleSync(app)}
                    disabled={isSyncing}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando' : 'Sync'}
                  </button>
                  {rec && (
                    <button
                      onClick={() => handleApply(app)}
                      disabled={isApplied}
                      className="px-3 py-2 rounded-lg text-xs font-bold bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isApplied ? <><CheckCircle2 className="w-3.5 h-3.5" /> Aplicado</> : 'Aplicar'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
