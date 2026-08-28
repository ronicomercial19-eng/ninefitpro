import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, Dumbbell, Share2, Users, Tag, Trophy, ChevronLeft, ChevronRight, Activity, Sparkles } from 'lucide-react';
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

// FIX #29 (QA Master): curva de XP por nível — antes não existia
// fórmula nenhuma ligando total_xp a level em lugar algum do sistema.
// Definida: Nível N exige N x 500 XP acumulados (1: 0-500, 2: 500-1000...).
const XP_PER_LEVEL = 500;
function xpProgress(totalXp: number) {
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  const xpForNext = XP_PER_LEVEL;
  return { level, xpIntoLevel, xpForNext, pct: Math.min(100, (xpIntoLevel / xpForNext) * 100) };
}

export function OSDashboard() {
  const { user, profile } = useAuth();
  const { athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { totalXp, syncScore } = useEngrenagem();
  const { level, xpIntoLevel, xpForNext, pct } = xpProgress(totalXp);

  const [ranking, setRanking] = useState<RankRow[]>([]);
  // FIX #26 (QA Master): "Ranking Global" com 1 usuário/0 pontos não é
  // competição real. Rastreia se existe pelo menos 1 outro atleta com
  // XP > 0 pra decidir entre mostrar o ranking ou um estado "começando".
  const [hasRealCompetition, setHasRealCompetition] = useState(true);
  const [eventIdx, setEventIdx] = useState(0);

  const name = (athleteName || profile?.full_name || user?.email?.split(' ')[0] || 'Atleta').split(' ')[0];
  const classTier = totalXp > 2000 ? 'Elite Trainer' : totalXp > 800 ? 'Pro' : 'Iniciante';

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
      const others = rows.filter((r) => (r.name || '').split(' ')[0].toLowerCase() !== name.toLowerCase());
      setHasRealCompetition(others.some((r) => Number(r.total_xp || 0) > 0));
      setRanking(top);
    })();
  }, [name, totalXp]);


  const events = [
    { label: 'Desafio de Força', cta: 'Participar', route: '/9fit/community' },
    { label: 'Recovery Week', cta: 'Ativar', route: '/9fit/elite-bio' },
  ];
  const ev = events[eventIdx];

  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/9fit/profile')} className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center">
          <Menu className="w-4 h-4 text-foreground" />
        </button>
        <div className="text-center">
          {/* FIX #38/#39/#40 (QA Master): padroniza a marca — "FIT OS"
              (sem "+" solto), sem sobreposição com "9FIT PRO"/"RON". */}
          <h1 className="font-display text-2xl tracking-tight">
            FIT <span className="text-primary">OS</span>
          </h1>
        </div>
        <button onClick={() => navigate('/9fit/settings')} className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center">
          <Settings className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Personal ID Card */}
      <section className="rounded-3xl border border-primary/40 bg-card/40 p-5 shadow-[0_0_40px_-16px_hsl(var(--primary)/0.6)]">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Personal ID Card</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary font-display text-lg">
                {name[0]}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Olá,</p>
                <p className="font-display text-2xl leading-none">{name}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3"><span className="font-semibold text-foreground">Nível:</span> {level}</p>
            <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Classe:</span> {classTier}</p>
            {/* FIX #29 (QA Master): economia de XP visível — nível atual e quanto falta */}
            <div className="mt-2 w-40">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-data">
                <span>Nível {level}</span>
                <span>{xpIntoLevel}/{xpForNext} XP</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sync Score</p>
            <div className="relative w-24 h-24 mt-1">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15" stroke="hsl(var(--muted))" strokeWidth="3" fill="none" />
                <circle cx="18" cy="18" r="15" stroke="hsl(var(--primary))" strokeWidth="3" fill="none"
                  strokeDasharray={`${(syncScore || 0) * 0.94} 100`} strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary)/0.6))' }} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-display text-2xl">
                {Math.round(syncScore || 0)}%
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Ecossistema atalhos */}
      <section className="rounded-3xl border border-primary/30 bg-card/30 p-4">
        <p className="font-display text-xl mb-3">Ecossistema</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { I: Dumbbell, label: 'Train', route: '/9fit/train' },
            { I: Share2, label: 'Hub', route: '/9fit/hub' },
            { I: Users, label: 'Staff', route: '/9fit/staff' },
            { I: Tag, label: 'Market', route: '/9fit/protocols' },
          ].map(({ I, label, route }) => (
            <button key={label} onClick={() => navigate(route)}
              className="rounded-2xl border border-primary/30 bg-white/[0.02] py-3 flex items-center justify-center gap-2 hover:bg-primary/[0.06] transition">
              <I className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Ranking Global */}
      <section className="rounded-3xl border border-primary/30 bg-card/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-xl">Ranking Global</p>
          <Trophy className="w-5 h-5 text-primary" />
        </div>
        {hasRealCompetition ? (
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
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm font-semibold">Você está começando agora</p>
            <p className="text-xs text-muted-foreground mt-1">O ranking é liberado quando houver outros atletas competindo com XP.</p>
          </div>
        )}
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
      <section className="rounded-3xl border border-primary/30 bg-card/30 p-4">
        <p className="font-display text-xl mb-3">Destaques</p>
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
