import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, Dumbbell, Heart, Brain, Crown, BarChart2 } from 'lucide-react';
import type { SquadInsight } from '@/services/engrenagem/recommendationEngine';

const ICONS = {
  recovery: Heart,
  training: Dumbbell,
  nutrition: Activity,
  mindset: Brain,
  premium: Crown,
  analytics: BarChart2,
} as const;

const PRIORITY_RING = {
  high: 'ring-1 ring-primary/40',
  medium: 'ring-1 ring-white/10',
  low: 'ring-1 ring-white/5',
} as const;

export function RecommendationCard({ insight }: { insight: SquadInsight }) {
  const navigate = useNavigate();
  const Icon = ICONS[insight.icon] ?? Activity;

  return (
    <div className={`surface-card p-4 ${PRIORITY_RING[insight.priority]} hover-magnetic`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-elevated flex items-center justify-center text-primary shrink-0">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-data tracking-[0.2em] text-muted-foreground">
              SQUAD · {insight.squad}
            </span>
            {insight.priority === 'high' && (
              <span className="text-[9px] font-bold text-primary tracking-wider">PRIORITÁRIO</span>
            )}
          </div>
          <p className="font-display text-sm text-foreground mb-1">{insight.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{insight.message}</p>
          {insight.cta && (
            <button
              onClick={() => navigate(insight.cta!.route)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
            >
              {insight.cta.label}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
