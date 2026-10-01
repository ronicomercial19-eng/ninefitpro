import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import { loadEngrenagemContext, getSquadInsights, type SquadInsight } from '@/services/engrenagem/recommendationEngine';

interface EngrenagemState {
  loading: boolean;
  totalXp: number;
  level: number;
  syncScore: number;
  streak: number;
  isPremium: boolean;
  insights: SquadInsight[];
  refresh: () => Promise<void>;
}

export function useEngrenagem(): EngrenagemState {
  const { user } = useAuth();
  const [state, setState] = useState<Omit<EngrenagemState, 'refresh'>>({
    loading: true, totalXp: 0, level: 1, syncScore: 0, streak: 0, isPremium: false, insights: [],
  });

  const refresh = useCallback(async () => {
    const ctx = await loadEngrenagemContext();
    const insights = getSquadInsights(ctx);
    setState({
      loading: false,
      totalXp: ctx.totalXp,
      level: ctx.level,
      syncScore: ctx.syncScore,
      streak: ctx.streak,
      isPremium: ctx.isPremium ?? false,
      insights,
    });
  }, [user?.id]);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    ['9fit:sync_updated','9fit:workout-updated','9fit:user-state-invalidated','9fit:profile-updated'].forEach(event => window.addEventListener(event, handler));
    window.addEventListener('9fit:xp_awarded', handler);
    window.addEventListener('9fit:protocol_completed', handler);
    window.addEventListener('9fit:mission_completed', handler);
    return () => {
      ['9fit:sync_updated','9fit:workout-updated','9fit:user-state-invalidated','9fit:profile-updated'].forEach(event => window.removeEventListener(event, handler));
      window.removeEventListener('9fit:xp_awarded', handler);
      window.removeEventListener('9fit:protocol_completed', handler);
      window.removeEventListener('9fit:mission_completed', handler);
    };
  }, [refresh]);

  return { ...state, refresh };
}
