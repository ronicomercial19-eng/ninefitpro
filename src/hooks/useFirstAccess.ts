import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { finalizeFirstAccess } from '@/lib/firstAccess';

interface UseFirstAccessResult {
  isFirstAccess: boolean;
  isLoading: boolean;
  athleteId: string | null;
  markCompleted: () => Promise<void>;
}

/**
 * Detecta se o usuário ainda precisa concluir o fluxo de primeiro acesso
 * (troca obrigatória de senha). Resolve o bug do loop pós-troca de senha
 * persistindo o estado no profile via RPC SECURITY DEFINER.
 */
export function useFirstAccess(): UseFirstAccessResult {
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoading(false); return; }

        // 1) Profile gate — fonte de verdade canônica
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_access_completed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.first_access_completed === true) {
          setIsFirstAccess(false);
          setIsLoading(false);
          return;
        }

        // 2) Atleta com senha temporária pendente?
        const { data: athlete } = await supabase
          .from('athletes')
          .select('id, password_changed')
          .eq('user_id', user.id)
          .maybeSingle();

        if (athlete) {
          setAthleteId(athlete.id);
          setIsFirstAccess(athlete.password_changed === false);
        } else {
          // Coach/admin sem registro de atleta — não precisa do fluxo
          setIsFirstAccess(false);
        }
      } catch (e) {
        console.error('[useFirstAccess]', e);
      } finally {
        setIsLoading(false);
      }
    };
    check();
  }, []);

  const markCompleted = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Sessão expirada. Entre novamente.');
    let store: Storage | undefined;
    try { store = localStorage; } catch { /* Optional storage. */ }
    await finalizeFirstAccess({ rpc: () => supabase.rpc('complete_first_access'), refreshSession: () => supabase.auth.refreshSession() }, user.id, store);
    setIsFirstAccess(false);
  };

  return { isFirstAccess, isLoading, athleteId, markCompleted };
}
