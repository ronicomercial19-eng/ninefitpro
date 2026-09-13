import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, Dumbbell, Share2, Users, Tag, Trophy, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useEngrenagem } from '@/hooks/useEngrenagem';
import { supabase } from '@/integrations/supabase/client';
import { ActivationMissionCard } from './ActivationMissionCard';
import { ActiveSkillsBadge } from './ActiveSkillsBadge';
import { QuickCheckIn } from './QuickCheckIn';
import { DynamicOffers } from './DynamicOffers';
import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';

interface RankRow { name: string; pts: number; self?: boolean }

export function OSDashboard() {
  const { user, profile } = useAuth();
  const { athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { totalXp } = useEngrenagem();

  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [eventIdx, setEventIdx] = useState(0);

  const name = (athleteName || profile?.full_name || user?.email?.split('@')[0] || 'Atleta').split(' ')[0];

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('athletes')
        .select('name, total_xp')
        .order('total_xp', { ascending: false, nullsFirst: false })
        .limit(20);
      const rows = (data || []) as any[];
      const top: RankRow[] = rows.slice(0, 3).map((r) => ({
        name: (r.name || '—').split(' ')[0],
        pts: Number(r.total_xp || 0),
      }));
      if (!top.find((t) => t.name.toLowerCase() === name.toLowerCase())) {
        top[2] = { name, pts: totalXp, self: true };
      } else {
        top.forEach((t) => { if (t.name.toLowerCase() === name.toLowerCase()) t.self = true; });
      }
      setRanking(top);
    })();
  }, [name, totalXp]);


  const events = [
    { label: 'Desafio de Força', cta: 'Participar', route: '/9fit/community' },
    { label: 'Recovery Week', cta: 'Ativar', route: '/9fit/elite-bio' },
  ];
  const ev = events[eventIdx];

  return (
    <div className="px-4 pt-2 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/9fit/profile')} className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center">
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <div className="text-center">
          <h1 className="font-display text-2xl tracking-tight">
            Fit <span className="text-primary">OS</span><sup className="text-primary">+</sup>
          </h1>
        </div>
        <button onClick={() => navigate('/9fit/settings')} className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Ecossistema atalhos */}
      <section className="fit-os-panel fit-os-grid bg-card/40 p-4">
        <div className="mb-3 flex items-end justify-between"><div><p className="fit-os-label mb-1">Atalhos do sistema</p><p className="font-display text-xl">Ecossistema</p></div><button type="button" onClick={() => navigate('/9fit/modules')} className="text-[10px] font-semibold uppercase tracking-widest text-primary">Ver módulos</button></div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { I: Dumbbell, label: 'Train', route: '/9fit/train' },
            { I: Share2, label: 'Hub', route: '/9fit/hub' },
            { I: Users, label: 'Staff', route: '/9fit/staff' },
            { I: Tag, label: 'Market', route: '/9fit/protocols' },
          ].map(({ I, label, route }) => (
            <button key={label} onClick={() => navigate(route)}
              className="fit-os-panel border-primary/30 bg-white/[0.02] py-3 flex items-center justify-center gap-2 hover:bg-primary/[0.06] transition">
              <I className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Ranking Global */}
      <section className="fit-os-panel bg-card/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-xl">Ranking Global</p>
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        <div className="space-y-2">
          {ranking.map((r, i) => (
            <div key={i} className={`flex items-center justify-between text-sm rounded-xl px-3 py-2 ${
              r.self ? 'bg-primary/10 border border-primary/40 text-primary' : ''
            }`}>
              <span className="font-data tabular-nums">{i + 1}. {r.name}</span>
              <span className="font-data tabular-nums">- {r.pts.toLocaleString('pt-BR')} pts</span>
            </div>
          ))}
        </div>
      </section>

      {/* Inteligência ativa */}
      <ActiveSkillsBadge />

      {/* Calibração diária (emoji quiz) */}
      <EmojiCalibrationQuiz />

      {/* Ativação */}
      <ActivationMissionCard />

      {/* Check-in */}
      <QuickCheckIn />

      {/* Destaques */}
      <section className="fit-os-panel bg-card/30 p-4">
        <p className="fit-os-label mb-1">Próxima ação</p><p className="font-display text-xl mb-3">Destaques</p>
        <div className="rounded-2xl border border-primary/30 bg-white/[0.02] p-4 flex items-center gap-3">
          <button onClick={() => setEventIdx((i) => (i - 1 + events.length) % events.length)}
            className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Evento:</p>
              <p className="font-semibold">{ev.label}</p>
            </div>
            <button onClick={() => navigate(ev.route)}
              className="bg-primary text-primary-foreground text-xs font-semibold rounded-full px-4 py-2">
              {ev.cta}
            </button>
          </div>
          <button onClick={() => setEventIdx((i) => (i + 1) % events.length)}
            className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {events.map((_, i) => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === eventIdx ? 'bg-primary' : 'bg-white/20'}`} />
          ))}
        </div>
      </section>

      <DynamicOffers compact />
    </div>
  );
}
