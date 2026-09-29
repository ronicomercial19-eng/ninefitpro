import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Menu,
  Dumbbell,
  Share2,
  Users,
  Tag,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Rocket,
  Check,
  X,
  ArrowUpRight,
  ShieldCheck,
  Compass,
  Zap,
  Layers,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAthleteId } from '@/hooks/useAthleteId';
import { useEngrenagem } from '@/hooks/useEngrenagem';
import { supabase } from '@/integrations/supabase/client';
import { ActivationMissionCard } from './ActivationMissionCard';
import { ActiveSkillsBadge } from './ActiveSkillsBadge';
import { QuickCheckIn } from './QuickCheckIn';
import { EmojiCalibrationQuiz } from './EmojiCalibrationQuiz';
import { HubCommandDeck } from './HubCommandDeck';
import type { HubScoreStatus } from '@/hooks/useAthleteScores';
import communityTribeImg from '@/assets/images/community_athletes_tribe_1790011163765.jpg';
import challengeBannerImg from '@/assets/images/challenge_season_banner_1790011176020.jpg';
import victoryMuralImg from '@/assets/images/victory_mural_record_1790011189778.jpg';

interface RankRow { name: string; pts: number; self?: boolean }
interface LeaderboardRow { name: string | null; total_xp: number | null }

interface OSDashboardProps {
  name: string;
  syncScore: number | null;
  scoreStatus: HubScoreStatus;
  weekly: { treinos: number; nutri: number; minutos: number };
  hasPlan: boolean;
}

type ModalPillarId = 'fisica' | 'nutricional' | 'psicologica' | 'comportamental' | 'biometrica' | 'ambiental' | null;

export function OSDashboard({ name, syncScore, scoreStatus, weekly, hasPlan }: OSDashboardProps) {
  const { user, profile } = useAuth();
  const { athleteName } = useAthleteId();
  const navigate = useNavigate();
  const { totalXp } = useEngrenagem();

  const [ranking, setRanking] = useState<RankRow[]>([]);
  const [ecosystemActiveCount, setEcosystemActiveCount] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ModalPillarId>(null);
  const [eventIdx, setEventIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('fn_get_leaderboard', { p_limit: 20 });
      if (error) {
        console.error('[OSDashboard] fn_get_leaderboard falhou:', error);
        setRanking([]);
        return;
      }
      const rows = (data || []) as LeaderboardRow[];
      const top: RankRow[] = rows.slice(0, 3).map((r) => ({
        name: (r.name || '—').split(' ')[0],
        pts: Number(r.total_xp || 0),
      }));
      top.forEach((t) => { if (t.name.toLowerCase() === name.toLowerCase()) t.self = true; });
      setRanking(top);
    })();
  }, [name, totalXp]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('physio_modules')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[OSDashboard] physio_modules count falhou:', error);
          setEcosystemActiveCount(null);
          return;
        }
        setEcosystemActiveCount(count ?? 0);
      });
    return () => { cancelled = true; };
  }, []);

  const myRankPos = ranking.findIndex((r) => r.self) + 1;
  const hasRank = myRankPos > 0;
  const treinoStatus = weekly.treinos > 0 ? `${weekly.treinos} treinos` : hasPlan ? 'Plano ativo' : 'Sem treino';
  const nutriStatus = weekly.nutri > 0 ? `${weekly.nutri} refeições` : 'Sem registro';
  const focoStatus = syncScore == null ? 'A calibrar' : `Sync ${Math.round(syncScore)}`;
  const consistenciaStatus = weekly.treinos > 0 ? `${weekly.treinos}/5 sem` : 'Sem ciclo';
  const recuperacaoStatus = syncScore == null ? 'Calibrar' : 'Com leitura';
  const ecosystemStatus = ecosystemActiveCount == null ? 'Ver módulos' : `${ecosystemActiveCount} ativos`;

  // Comunidade & Notícias — Apresentação 100% Visual com Imagens Cinematográficas
  const seasonEvents = [
    {
      id: 'community-feed',
      image: communityTribeImg,
      tag: 'COMUNIDADE 9FIT',
      category: 'TRIBOS & ATLETAS',
      title: 'Tribos de Atletas & Feed Coletivo',
      description: 'Conecte-se com outros atletas, compartilhe rotinas e evolua junto.',
      stats: 'Comunidade ativa',
      cta: 'Acessar Comunidade',
      route: '/9fit/community'
    },
    {
      id: 'news-updates',
      image: challengeBannerImg,
      tag: 'NOTÍCIAS & UPDATES',
      category: 'DESAFIO DA TEMPORADA',
      title: 'Desafio Semanal: 5 Treinos Ativos',
      description: 'Mantenha a consistência no microciclo para acelerar sua telemetria.',
      stats: 'Temporada Oficial',
      cta: 'Ver Novidades',
      route: '/9fit/social'
    },
    {
      id: 'social-ranking',
      image: victoryMuralImg,
      tag: 'MURAL DE VITÓRIAS',
      category: 'RECORDES PESSOAIS',
      title: 'Conquistas Recentes & Subidas de Nível',
      description: 'Comemore recordes de carga batidos e marcos recentes da comunidade.',
      stats: 'Ranking da comunidade',
      cta: 'Mural de Vitórias',
      route: '/9fit/social'
    }
  ];

  const currentEvent = seasonEvents[eventIdx];

  // Pilares da Consultoria 360: status sempre derivado de dado real da sessão ou do Supabase.
  const pillars = [
    {
      id: 'fisica' as const,
      name: 'Treino & Cargas',
      subtitle: hasRank ? `Ranking real: posição #${myRankPos}` : hasPlan ? 'Prescrição ativa no ciclo' : 'Sem prescrição ativa detectada',
      status: hasRank ? `#${myRankPos}` : treinoStatus,
      description: 'Progressão de cargas, densidade de treino e biomecânica executiva.'
    },
    {
      id: 'nutricional' as const,
      name: 'Nutrição & Dieta',
      subtitle: weekly.nutri > 0 ? `${weekly.nutri} refeições registradas na semana` : 'Nenhuma refeição registrada nesta semana',
      status: nutriStatus,
      description: 'Janela anabólica, síntese de aminoácidos e equilíbrio de macronutrientes.'
    },
    {
      id: 'psicologica' as const,
      name: 'Foco & Mente',
      subtitle: syncScore == null ? 'Aguardando calibração do Sync Score' : 'RON usa seu contexto de prontidão atual',
      status: focoStatus,
      description: 'Gestão de estresse, prontidão neural para carga e clareza mental.'
    },
    {
      id: 'comportamental' as const,
      name: 'Consistência',
      subtitle: weekly.treinos > 0 ? `${weekly.treinos} treinos no microciclo` : 'Ainda sem treino registrado no microciclo',
      status: consistenciaStatus,
      description: 'Consistência do microciclo, disciplina de horários e rituais diários.'
    },
    {
      id: 'biometrica' as const,
      name: 'Recuperação',
      subtitle: syncScore == null ? 'Faça uma calibração para ativar sinais de recuperação' : `Estado do score: ${scoreStatus}`,
      status: recuperacaoStatus,
      description: 'Variação da frequência cardíaca, qualidade de sono e peso seco.'
    },
    {
      id: 'ambiental' as const,
      name: 'Ecossistema',
      subtitle: ecosystemActiveCount == null ? 'Contagem de módulos em sincronização' : `${ecosystemActiveCount} módulos ativos no catálogo`,
      status: ecosystemStatus,
      description: 'Ecossistema 9FIT com rotas funcionais e módulos ativos do catálogo.'
    }
  ];

  return (
    <div className="px-3.5 sm:px-4 pt-1 space-y-3 sm:space-y-3.5 pb-12 max-w-2xl mx-auto">
      {/* Header Superior estilo High-Ticket (Whoop / Oura Studio) */}
      <header className="flex items-center justify-between py-1.5 border-b border-white/[0.05]">
        <button
          onClick={() => navigate('/9fit/profile')}
          aria-label="Menu do Atleta"
          className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] flex items-center justify-center transition-colors text-neutral-300"
        >
          <Menu className="w-3.5 h-3.5" />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="font-display font-bold text-xs sm:text-sm tracking-[0.24em] text-white uppercase">
              9FIT <span className="text-primary font-normal">OS</span>
            </span>
          </div>
          <span className="text-[8.5px] font-mono tracking-[0.2em] text-neutral-400 uppercase mt-0.5 font-medium">
            High Performance Architecture
          </span>
        </div>

        <button
          onClick={() => navigate('/9fit/settings')}
          aria-label="Configurações do Sistema"
          className="w-8 h-8 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.08] flex items-center justify-center transition-colors text-neutral-300"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </header>

      {/* Comando do dia — Telemetria de Estado do Atleta */}
      <HubCommandDeck
        name={name}
        syncScore={syncScore}
        scoreStatus={scoreStatus}
        weekly={weekly}
        hasPlan={hasPlan}
      />

      {/* =========================================================================
          CONSULTORIA 360: SINAIS DO ATLETA COM EFEITO DE FUNDO RADAR 360° HIGH-TICKET
         ========================================================================= */}
      <section className="relative rounded-xl border border-white/[0.09] bg-gradient-to-br from-[#12141a] via-[#0c0d11] to-[#090a0d] p-3 sm:p-3.5 shadow-2xl transition-all overflow-hidden">
        {/* Subtle hairline edge lighting no topo */}
        <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

        {/* EFEITOS DE FUNDO VISUAIS: Brilhos ambientes + Malha e Radar 360° */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          {/* Brilho radial primário no topo */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-40 bg-primary/[0.12] rounded-full blur-3xl" />
          {/* Brilho âmbar difuso no canto inferior direito */}
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-amber-500/[0.06] rounded-full blur-2xl" />

          {/* Malha sutil de micro-pontos */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:14px_14px] opacity-70" />

          {/* Radar 360° Geométrico em SVG (Marca d'água técnica de alta precisão) */}
          <svg
            className="absolute right-[-30px] top-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 text-primary/[0.08] pointer-events-none"
            viewBox="0 0 200 200"
            fill="none"
          >
            {/* Círculos concêntricos 360° */}
            <circle cx="100" cy="100" r="92" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="100" r="48" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
            <circle cx="100" cy="100" r="26" stroke="currentColor" strokeWidth="1" />
            <circle cx="100" cy="100" r="4" fill="currentColor" />
            {/* Eixos cruzados de mira orbital */}
            <line x1="100" y1="4" x2="100" y2="196" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
            <line x1="4" y1="100" x2="196" y2="100" stroke="currentColor" strokeWidth="0.8" strokeDasharray="4 4" />
            {/* Marcações angulares 360 */}
            <text x="100" y="16" textAnchor="middle" fill="currentColor" fontSize="5" fontFamily="monospace" fontWeight="bold">0°</text>
            <text x="188" y="102" textAnchor="middle" fill="currentColor" fontSize="5" fontFamily="monospace" fontWeight="bold">90°</text>
            <text x="100" y="190" textAnchor="middle" fill="currentColor" fontSize="5" fontFamily="monospace" fontWeight="bold">180°</text>
            <text x="14" y="102" textAnchor="middle" fill="currentColor" fontSize="5" fontFamily="monospace" fontWeight="bold">270°</text>
            <text x="145" y="55" fill="currentColor" fontSize="7" fontFamily="monospace" fontWeight="bold" opacity="0.8">360°</text>
          </svg>
        </div>

        {/* Cabeçalho do Card */}
        <div className="relative z-10 flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-primary font-bold">
              CONSULTORIA 360°
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 font-medium">
              SINAIS DO ATLETA
            </span>
          </div>
        </div>

        {/* Grid dos 6 Pilares com efeito translúcido (Glassmorphism sutil sobre o radar) */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
          {pillars.map((pillar) => (
            <button
              key={pillar.id}
              type="button"
              onClick={() => setActiveModal(pillar.id)}
              className="flex items-center justify-between text-left px-2.5 py-2 rounded-lg backdrop-blur-md bg-white/[0.025] hover:bg-white/[0.07] border border-white/[0.05] hover:border-primary/40 shadow-sm transition-all group cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* Checkmark com acento laranja de alta precisão */}
                <Check className="w-3 h-3 text-primary shrink-0 transition-transform group-hover:scale-110" strokeWidth={2.5} />
                <span className="font-semibold text-[11px] sm:text-xs tracking-wider text-neutral-100 truncate group-hover:text-white transition-colors uppercase">
                  {pillar.name}
                </span>
              </div>

              <span className="text-[8.5px] sm:text-[9px] font-mono font-medium tracking-wider text-neutral-400 group-hover:text-primary transition-colors shrink-0 ml-1">
                {pillar.status}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* =========================================================================
          COMUNIDADE & NOTÍCIAS — Apresentação 100% Visual com Imagens Cinematográficas
         ========================================================================= */}
      <section className="rounded-xl border border-white/[0.08] bg-[#0c0d10] p-3 sm:p-3.5 shadow-xl relative overflow-hidden space-y-2.5">
        {/* Header Superior */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-primary font-bold">
              COMUNIDADE & NOTÍCIAS
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEventIdx((i) => (i - 1 + seasonEvents.length) % seasonEvents.length)}
              aria-label="Apresentação anterior"
              className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEventIdx((i) => (i + 1) % seasonEvents.length)}
              aria-label="Próxima apresentação"
              className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors text-neutral-400 hover:text-white cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Hero Visual Principal — 100% Baseado em Imagem */}
        <div className="relative rounded-lg overflow-hidden border border-white/10 group">
          <div className="relative h-44 sm:h-52 md:h-60 w-full overflow-hidden bg-black">
            <img
              src={currentEvent.image}
              alt={currentEvent.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {/* Gradientes cinematográficos de iluminação */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
          </div>

          {/* Tag Flutuante no Topo da Imagem */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-md border border-white/15">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-200 font-semibold">
              {currentEvent.tag}
            </span>
          </div>

          <div className="absolute top-2.5 right-2.5 hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono text-amber-300 font-medium">
            <Sparkles className="w-3 h-3 text-primary" />
            <span>{currentEvent.stats}</span>
          </div>

          {/* Informações e Ação Sobrepostas na Imagem */}
          <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[8.5px] font-mono uppercase tracking-widest text-primary font-bold block mb-1">
                {currentEvent.category}
              </span>
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white tracking-tight leading-tight font-display drop-shadow-md">
                {currentEvent.title}
              </h3>
              <p className="text-[11.5px] sm:text-xs text-neutral-300 mt-1 line-clamp-1 sm:line-clamp-2 max-w-xl font-normal drop-shadow">
                {currentEvent.description}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(currentEvent.route)}
              className="py-2 px-3.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-end"
            >
              <span>{currentEvent.cta}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Galeria de Miniaturas Visuais — Todos os 3 destaques visíveis simultaneamente */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-0.5">
          {seasonEvents.map((item, i) => {
            const isSelected = i === eventIdx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setEventIdx(i)}
                className={`relative rounded-md overflow-hidden text-left border transition-all cursor-pointer group/thumb h-14 sm:h-16 ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary/60 shadow-md scale-[1.02]'
                    : 'border-white/10 opacity-60 hover:opacity-100 hover:border-white/30'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute bottom-1 inset-x-1 sm:inset-x-1.5">
                  <span className="text-[8px] sm:text-[9.5px] font-semibold text-white truncate block leading-tight">
                    {item.title}
                  </span>
                  <span className="text-[7px] sm:text-[8px] font-mono text-neutral-400 block truncate">
                    {item.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SPLASH MODAL LUXURY HIGH-TICKET (Ao clicar em qualquer pilar do Card 360)
         ========================================================================= */}
      <AnimatePresence>
        {activeModal && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
          >
            <motion.div
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border border-white/15 bg-[#101114] p-4 sm:p-5 shadow-2xl flex flex-col my-auto"
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Splash Modal */}
              <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="text-[9.5px] font-mono uppercase tracking-[0.2em] text-primary font-bold">
                    PILAR {activeModal.toUpperCase()} · VISÃO DETALHADA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-7 h-7 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Conteúdo específico com acabamento High-Ticket */}
              <div className="space-y-3.5">
                {/* 1. FÍSICA: Ranking & Desempenho */}
                {activeModal === 'fisica' && (
                  <div className="space-y-2.5">
                    <div className="text-center pb-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">Tabela Oficial de Alta Performance</h3>
                      <p className="text-[11.5px] text-neutral-400">Classificação de XP baseada em consistência e execução técnica</p>
                    </div>
                    <div className="space-y-1.5">
                      {ranking.map((r, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between text-xs rounded-lg px-3 py-2.5 transition-all ${
                            r.self
                              ? 'bg-amber-400/10 border border-amber-400/30 text-amber-200 font-semibold'
                              : 'bg-white/[0.02] border border-white/5 text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold text-[11px] ${
                              i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-neutral-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-neutral-400'
                            }`}>
                              #{i + 1}
                            </span>
                            <span className="font-medium text-white">{r.name} {r.self && <span className="text-[10px] text-amber-300 font-normal">(Você)</span>}</span>
                          </div>
                          <span className="font-mono font-semibold text-neutral-200 tabular-nums">
                            {r.pts.toLocaleString('pt-BR')} <span className="text-[10px] text-neutral-400 font-normal">XP</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { setActiveModal(null); navigate('/9fit/train'); }}
                      className="w-full py-2.5 mt-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Dumbbell className="w-3.5 h-3.5" />
                      <span>Ir para Treinos & Séries</span>
                    </button>
                  </div>
                )}

                {/* 2. NUTRICIONAL: Janela Metabólica & Dieta */}
                {activeModal === 'nutricional' && (
                  <div className="space-y-2.5">
                    <div className="text-center pb-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">Bio-Nutrição & Janela Metabólica</h3>
                      <p className="text-[11.5px] text-neutral-400">Registros de refeição e hidratação conectados à dieta</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-black/40 border border-white/5 text-center">
                      <div>
                        <span className="text-[8.5px] font-mono uppercase text-neutral-400 block font-medium">PROTEÍNA</span>
                        <span className="text-xs font-bold text-white font-mono mt-0.5 block">{weekly.nutri > 0 ? 'Com registro' : 'Sem meta'}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono uppercase text-neutral-400 block font-medium">REFEIÇÕES</span>
                        <span className="text-xs font-bold text-white font-mono mt-0.5 block">{weekly.nutri > 0 ? `${weekly.nutri} registradas` : 'Nenhuma'}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-mono uppercase text-neutral-400 block font-medium">HIDRATAÇÃO</span>
                        <span className="text-xs font-bold text-white font-mono mt-0.5 block">Registrar</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setActiveModal(null); navigate('/9fit/dieta'); }}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>Acessar Dieta</span>
                    </button>
                  </div>
                )}

                {/* 3. PSICOLÓGICA: Ron AI & Active Skills */}
                {activeModal === 'psicologica' && (
                  <div className="space-y-2.5">
                    <div className="text-center pb-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">Inteligência Ativa Ron AI</h3>
                      <p className="text-[11.5px] text-neutral-400">Modelos de IA, prontidão cognitiva e adaptação de carga</p>
                    </div>
                    <ActiveSkillsBadge />
                    <button
                      onClick={() => { setActiveModal(null); navigate('/9fit/ron?context=hub_command'); }}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Falar com o Treinador Ron</span>
                    </button>
                  </div>
                )}

                {/* 4. COMPORTAMENTAL: Missão de Ativação */}
                {activeModal === 'comportamental' && (
                  <div className="space-y-2.5">
                    <div className="text-center pb-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">Metas & Adesão do Ciclo</h3>
                      <p className="text-[11.5px] text-neutral-400">Progresso do microciclo atual e consistência semanal</p>
                    </div>
                    <ActivationMissionCard />
                    <button
                      onClick={() => { setActiveModal(null); navigate('/9fit/ativacao'); }}
                      className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <Rocket className="w-3.5 h-3.5" />
                      <span>Acessar Painel de Ativação</span>
                    </button>
                  </div>
                )}

                {/* 5. BIOMÉTRICA: Check-in & Bio-Feedback */}
                {activeModal === 'biometrica' && (
                  <div className="space-y-3">
                    <div className="text-center pb-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">Telemetria & Validação Diária</h3>
                      <p className="text-[11.5px] text-neutral-400">Registro de presença, humor, prontidão e recuperação do sono</p>
                    </div>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <p className="text-[11px] font-semibold text-neutral-300 mb-1.5">Check-in de Presença:</p>
                        <QuickCheckIn />
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                        <p className="text-[11px] font-semibold text-neutral-300 mb-1.5">Calibração de Energia & Sono:</p>
                        <EmojiCalibrationQuiz />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. AMBIENTAL: Ecossistema de módulos ativos */}
                {activeModal === 'ambiental' && (
                  <div className="space-y-2.5">
                    <div className="text-center pb-0.5">
                      <h3 className="text-sm sm:text-base font-bold text-white font-display">Ecossistema Fit OS</h3>
                      <p className="text-[11.5px] text-neutral-400">Módulos ativos e rotas funcionais do ecossistema 9FIT</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { I: Dumbbell, label: 'Train', desc: 'Treinos e Séries', route: '/9fit/train' },
                        { I: Share2, label: 'Hub', desc: 'Centro do Atleta', route: '/9fit/hub' },
                        { I: Users, label: 'Staff', desc: 'Personal & Equipe', route: '/9fit/staff' },
                        { I: Tag, label: 'Protocolos', desc: 'Conteúdo e planos', route: '/9fit/protocols' },
                      ].map(({ I, label, desc, route }) => (
                        <button
                          key={label}
                          onClick={() => { setActiveModal(null); navigate(route); }}
                          className="p-2.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40 flex items-center gap-2.5 transition-all text-left group"
                        >
                          <div className="w-7 h-7 rounded-md bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/50 group-hover:scale-105 transition-all">
                            <I className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[11.5px] font-bold text-white block leading-tight">{label}</span>
                            <span className="text-[9.5px] text-neutral-400 block truncate">{desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Fechar no rodapé do modal */}
              <div className="pt-3 mt-3 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Fechar Visualização
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
