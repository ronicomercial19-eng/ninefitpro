import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Menu, Dumbbell, Share2, Users, Tag, Trophy, ChevronLeft, ChevronRight, Activity, Sparkles, Grid3x3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useEngrenagem } from '@/hooks/useEngrenagem';
import { supabase } from '@/integrations/supabase/client';
import { ActivationMissionCard } from './ActivationMissionCard';
import { ActiveSkillsBadge } from './ActiveSkillsBadge';
import { QuickCheckIn } from './QuickCheckIn';
import { DynamicOffers } from './DynamicOffers';
import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';
import { HubCommandDeck } from './HubCommandDeck';
import { CollapsibleRow } from './CollapsibleRow';
import type { HubScoreStatus } from '@/hooks/useAthleteScores';

interface RankRow { name: string; pts: number; self?: boolean }

interface OSDashboardProps {
  name: string;
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  weekly: { treinos: number; nutri: number; minutos: number };
  hasPlan: boolean;
}

/**
 * Redesign Nine Pro v2 (14/09): "uma decisão por tela, navegação progressiva".
 * Só o Comando do dia (HubCommandDeck) fica aberto e com brilho — é a única
 * decisão que a Home pede agora. Calibração diária, Ranking, Inteligência
 * ativa, Ativação, Check-in e Ecossistema viram resumo de 1 linha
 * (CollapsibleRow), que expande in-place sem sair da tela. Nada foi removido
 * — só a sequência e o peso visual mudaram (princípio 04: arquitetura preservada).
 */
export function OSDashboard({ name, syncScore, scoreStatus, weekly, hasPlan }: OSDashboardProps) {
  const { user, profile } = useAuth();
  const { athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { totalXp } = useEngrenagem();

  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [eventIdx, setEventIdx] = useState(0);

  const topBarName = (athleteName || profile?.full_name || user?.email?.split(' ')[0] || name || 'Atleta').split(' ')[0];

  useEffect(() => {
    // QA Fase F (16/09): antes lia `athletes` direto, mas a RLS só deixa cada
    // atleta ver a própria linha — "Ranking Global" nunca mostrou concorrentes
    // de verdade pra ninguém. fn_get_leaderboard() é SECURITY DEFINER,
    // deliberadamente pública dentro do app (só nome + xp, nada sensível).
    (async () => {
      const { data, error } = await supabase.rpc('fn_get_leaderboard' as any, { p_limit: 20 });
      if (error) {
        console.error('[OSDashboard] fn_get_leaderboard falhou:', error);
        setRanking([{ name, pts: totalXp, self: true }]);
        return;
      }
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
  const myRankPos = ranking.findIndex((r) => r.self) + 1;

  return (
    <div className="px-4 pt-2 space-y-2.5">
      {/* Top bar */}
      <div className="flex items-center justify-between pb-2">
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

      {/* Calibração diária — resumida (pedido do Rony: ordem mantida, peso visual reduzido) */}
      <CollapsibleRow label="Como você está hoje?">
        <EmojiCalibrationQuiz />
      </CollapsibleRow>

      {/* Comando do dia — único bloco aberto e com brilho da tela */}
      <div className="-mx-4 pt-1">
        <HubCommandDeck name={name} syncScore={syncScore} scoreStatus={scoreStatus} weekly={weekly} hasPlan={hasPlan} />
      </div>

      {/* Ranking Global — resumido */}
      <CollapsibleRow
        icon={<Trophy className="w-4 h-4 text-primary shrink-0" />}
        label={myRankPos > 0 ? `Você é #${myRankPos} no ranking` : 'Ranking global'}
      >
        <div className="space-y-2 pt-1">
          {ranking.map((r, i) => (
            <div key={i} className={`flex items-center justify-between text-sm rounded-xl px-3 py-2 ${
              r.self ? 'bg-primary/10 border border-primary/40 text-primary' : ''
            }`}>
              <span className="font-data tabular-nums">{i + 1}. {r.name}</span>
              <span className="font-data tabular-nums">- {r.pts.toLocaleString('pt-BR')} pts</span>
            </div>
          ))}
        </div>
      </CollapsibleRow>

      {/* Inteligência ativa — resumida */}
      <CollapsibleRow icon={<Sparkles className="w-4 h-4 text-primary shrink-0" />} label="Inteligência ativa">
        <ActiveSkillsBadge />
      </CollapsibleRow>

      {/* Ativação — resumida */}
      <CollapsibleRow label="Sua ativação">
        <ActivationMissionCard />
      </CollapsibleRow>

      {/* Check-in — resumido */}
      <CollapsibleRow label="Check-in rápido">
        <QuickCheckIn />
      </CollapsibleRow>

      {/* Ecossistema — resumido */}
      <CollapsibleRow icon={<Grid3x3 className="w-4 h-4 text-muted-foreground shrink-0" />} label="Ecossistema · 4 módulos">
        <div className="flex items-end justify-between mb-3">
          <p className="fit-os-label">Atalhos do sistema</p>
          <button type="button" onClick={() => navigate('/9fit/modules')} className="text-[10px] font-semibold uppercase tracking-widest text-primary">Ver módulos</button>
        </div>
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
      </CollapsibleRow>

      {/* Destaques — mantido como carrossel horizontal (já compacto, não compete em altura) */}
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
