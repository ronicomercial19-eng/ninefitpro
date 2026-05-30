import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Target, Activity, Dumbbell, Heart, CheckCircle2 } from 'lucide-react';
import { BottomNavigation } from '@/components/9fit/BottomNavigation';
import { PrimePassHub } from '@/components/9fit/PrimePassHub';

type View = 'hub' | 'elite';

export default function NineFitPrime() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('hub');

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-white/5">
        <div className="flex items-center gap-3 px-4 py-4">
          {view === 'elite' ? (
            <button onClick={() => setView('hub')} className="w-9 h-9 rounded-full bg-elevated flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-[10px] font-data tracking-[0.3em] text-muted-foreground">
              {view === 'elite' ? '9FIT · ELITE' : '9FIT · PRIME PASS'}
            </p>
            <h1 className="font-display text-xl">{view === 'elite' ? 'ELITE PROTOCOLS' : 'PrimePass Hub'}</h1>
          </div>
          <button
            onClick={() => navigate('/9fit/planos')}
            className="text-[10px] font-bold tracking-widest text-primary px-3 py-1.5 rounded-full border border-primary/30"
          >
            UPGRADE
          </button>
        </div>
      </header>

      {view === 'hub' && (
        <div className="px-4 pt-5 space-y-5">
          <div className="surface-card p-5 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 80% 0%, hsl(var(--primary) / 0.35), transparent 60%)' }}
            />
            <div className="relative">
              <p className="text-[10px] font-data tracking-[0.25em] text-primary mb-1">BENEFÍCIOS ATIVOS</p>
              <h2 className="font-display text-2xl">Você tem acesso PrimePass.</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                4 sub-apps liberados · RON ilimitado · Protocolos Elite
              </p>
              <div className="grid grid-cols-4 gap-2">
                {['ELITE', 'BIO', 'KITCHEN', 'RECOVERY'].map(t => (
                  <span key={t} className="text-[9px] font-bold text-center tracking-widest text-foreground/90 py-2 rounded-lg bg-elevated">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="text-label">SUB-APPS</p>
          <PrimePassHub onSelectElite={() => setView('elite')} />
        </div>
      )}

      {view === 'elite' && <EliteView />}

      <BottomNavigation />
    </div>
  );
}

function EliteView() {
  const [done, setDone] = useState<string[]>(['presence']);
  const tasks = [
    { id: 'presence', title: 'Ritual de Presença', when: 'AGORA', desc: 'Confirme sua entrada no lounge hoje.' },
    { id: 'protocol', title: 'Protocolo BIO-CORE', when: 'HOJE', desc: 'Sessão de força e performance.' },
    { id: 'metrics', title: 'Análise Bio-Métricas', when: 'ESTA SEMANA', desc: 'Próxima leitura profunda em 2 dias.' },
  ];
  const pillars = [
    { id: 'p1', title: 'POTÊNCIA CENTRAL', sub: 'BIOMECÂNICA', icon: Target, desc: 'Cada repetição educa sobre sistema vs improviso.' },
    { id: 'p2', title: 'FOUNDER HP', sub: 'BIODADOS', icon: Activity, desc: 'Protocolos de alto rendimento para quem lidera.' },
    { id: 'p3', title: 'MECÂNICA APLICADA', sub: 'EXECUÇÃO', icon: Dumbbell, desc: 'Cadência e amplitude calibradas em tempo real.' },
    { id: 'p4', title: 'METABÓLICO', sub: 'EFICIÊNCIA', icon: Heart, desc: 'Oxidação lipídica sincronizada com seu ciclo.' },
  ];

  return (
    <div className="px-4 pt-5 space-y-7">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-data tracking-[0.25em] text-muted-foreground">01 · AUDITORIA BIO-FÍSICA</span>
          <span className="text-[10px] font-bold tracking-widest text-primary">SINTONIZADO</span>
        </div>
        <div className="surface-card p-5">
          <p className="font-display text-lg mb-3">Sincronia de Sistema</p>
          <div className="space-y-3">
            <Row icon={Dumbbell} title="Bio-mecânica aplicada" desc="Cadência e contração de alta performance ativas." />
            <Row icon={Heart} title="Eficiência metabólica" desc="Queima e oxidação sintonizadas com o Lounge Elite." />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <span className="text-[10px] font-data tracking-[0.25em] text-muted-foreground">02 · PILARES DE PERFORMANCE</span>
        <div className="grid grid-cols-2 gap-3">
          {pillars.map(p => {
            const Icon = p.icon;
            return (
              <div key={p.id} className="surface-card p-4">
                <div className="w-10 h-10 rounded-xl bg-elevated border border-white/5 flex items-center justify-center text-primary mb-3">
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <p className="font-display text-sm">{p.title}</p>
                <p className="text-[9px] tracking-widest text-muted-foreground mb-2">{p.sub}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <span className="text-[10px] font-data tracking-[0.25em] text-muted-foreground">03 · RITUAL DE ELITE</span>
        <div className="surface-card p-4 space-y-2">
          {tasks.map(t => {
            const isDone = done.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => setDone(prev => isDone ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-elevated/50 hover:bg-elevated transition-colors text-left"
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                  isDone ? 'bg-primary text-primary-foreground' : 'border border-white/15 text-transparent'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{t.title}</p>
                  <p className="text-[10px] text-muted-foreground">{t.desc}</p>
                </div>
                <span className="text-[9px] font-bold tracking-widest text-primary">{t.when}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Row({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-tight">{title}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
