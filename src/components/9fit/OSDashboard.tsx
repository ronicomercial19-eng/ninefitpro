import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, Plus, Activity, CheckCircle2, MessageCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useEngrenagem } from '@/hooks/useEngrenagem';
import { DigitalIDCard } from './DigitalIDCard';
import { RecommendationCard } from './RecommendationCard';
import { EcosystemGrid } from './EcosystemGrid';
import { DynamicOffers } from './DynamicOffers';
import { QuickCheckIn } from './QuickCheckIn';
import { awardXP } from '@/services/engrenagem/gamificationEngine';
import { toast } from 'sonner';

const WATER_TARGET = 2000;
const WATER_STEP = 250;

export function OSDashboard() {
  const { user, profile } = useAuth();
  const { athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { totalXp, level, syncScore, streak, insights, loading, refresh } = useEngrenagem();

  const [water, setWater] = useState<number>(() => Number(localStorage.getItem('9fit_water_today') || 0));

  useEffect(() => {
    const today = new Date().toDateString();
    const last = localStorage.getItem('9fit_water_date');
    if (last !== today) {
      localStorage.setItem('9fit_water_date', today);
      localStorage.setItem('9fit_water_today', '0');
      setWater(0);
    }
  }, []);

  const addWater = async () => {
    const next = Math.min(WATER_TARGET, water + WATER_STEP);
    setWater(next);
    localStorage.setItem('9fit_water_today', String(next));
    await awardXP('water_log', { syncScore, streak });
    toast.success(`+${WATER_STEP}ml registrado`);
  };

  const name = (athleteName || profile?.full_name || user?.email?.split('@')[0] || 'Atleta').split(' ')[0];
  const waterPct = (water / WATER_TARGET) * 100;

  return (
    <div className="space-y-6 px-4 pt-4">
      <div>
        <p className="text-[10px] font-data tracking-[0.3em] text-muted-foreground">9FIT · OS</p>
        <h1 className="font-display text-2xl text-foreground mt-1">
          Olá, {name}. <span className="text-primary">Sistema online.</span>
        </h1>
      </div>

      <DigitalIDCard
        name={athleteName || name}
        level={level}
        syncScore={syncScore}
        totalXP={totalXp}
        streak={streak}
        classTier={totalXp > 2000 ? 'Elite' : 'Diamante'}
      />

      {/* Check-in da próxima aula → abre fluxo Staff */}
      <QuickCheckIn />

      {/* Ofertas dinâmicas (monetization_offers) */}
      <DynamicOffers compact />

      {/* Water tracker */}
      <div className="surface-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-primary" />
            <p className="text-label">HIDRATAÇÃO</p>
          </div>
          <span className="font-data text-sm">
            {water}ml <span className="text-muted-foreground">/ {WATER_TARGET}ml</span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-elevated overflow-hidden mb-3">
          <div className="h-full transition-all duration-500" style={{ width: `${waterPct}%`, background: 'hsl(var(--primary))' }} />
        </div>
        <button
          onClick={addWater}
          className="w-full surface-elevated py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-elevated/80 transition-colors"
        >
          <Plus className="w-4 h-4" /> +{WATER_STEP}ml
        </button>
      </div>

      {/* Squad Insights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-label flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            INSIGHTS DOS SQUADS
          </p>
          <button onClick={refresh} className="text-[10px] text-primary font-semibold tracking-widest">
            ATUALIZAR
          </button>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="surface-card p-4 animate-pulse h-24" />
          ) : insights.length === 0 ? (
            <div className="surface-card p-4 text-sm text-muted-foreground">
              Sistema calibrando… faça um check-in para gerar recomendações.
            </div>
          ) : (
            insights.map(i => <RecommendationCard key={i.id} insight={i} />)
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        <QuickAction icon={CheckCircle2} label="Check-in" onClick={() => navigate('/9fit/protocolo')} />
        <QuickAction icon={Activity} label="Treino" onClick={() => navigate('/9fit/train')} />
        <QuickAction icon={MessageCircle} label="RON" onClick={() => navigate('/9fit/ron')} />
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="surface-card p-4 flex flex-col items-center gap-2 hover:border-primary/30 transition-colors"
    >
      <Icon className="w-5 h-5 text-primary" strokeWidth={1.8} />
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
    </button>
  );
}
