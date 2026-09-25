import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseAthleteIdResult {
  athleteId: string | null;
  athleteName: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to get the athlete ID for the current authenticated user.
 * Uses a multi-fallback strategy:
 * 1. Direct user_id lookup in athletes table
 * 2. Fallback to athlete_auth_link table
 * 3. Fallback to email match in athletes table
 */
export function useAthleteId(): UseAthleteIdResult {
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAthleteId = async () => {
      setLoading(true);
      setError(null);
      setAthleteId(null);
      setAthleteName(null);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          if (!cancelled) {
            setError("Sessão expirada. Entre novamente para acessar seu perfil.");
            setLoading(false);
          }
          return;
        }

        console.log('[useAthleteId] Looking for athlete for user:', user.id, user.email);

        // Strategy 1: Direct lookup by user_id
        const { data: directAthlete } = await supabase
          .from('athletes')
          .select('id, name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (directAthlete) {
          console.log('[useAthleteId] Found via user_id:', directAthlete.id);
          if (!cancelled) {
            setAthleteId(directAthlete.id);
            setAthleteName(directAthlete.name);
            setLoading(false);
          }
          return;
        }

        // Strategy 2: Fallback to athlete_auth_link
        const { data: linkData } = await supabase
          .from('athlete_auth_link')
          .select('athlete_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (linkData?.athlete_id) {
          console.log('[useAthleteId] Found via athlete_auth_link:', linkData.athlete_id);
          
          // Get athlete name
          const { data: athlete } = await supabase
            .from('athletes')
            .select('name')
            .eq('id', linkData.athlete_id)
            .maybeSingle();
          
          if (!cancelled) {
            setAthleteId(linkData.athlete_id);
            setAthleteName(athlete?.name || null);
            setLoading(false);
          }
          return;
        }

        // Strategy 3: Fallback to email match
        if (user.email) {
          const { data: emailAthlete } = await supabase
            .from('athletes')
            .select('id, name')
            .eq('email', user.email)
            .maybeSingle();

          if (emailAthlete) {
            console.log('[useAthleteId] Found via email:', emailAthlete.id);
            if (!cancelled) {
              setAthleteId(emailAthlete.id);
              setAthleteName(emailAthlete.name);
              setLoading(false);
            }
            return;
          }
        }

        console.log('[useAthleteId] No athlete found for this user');
        if (!cancelled) {
          setError('Perfil de atleta não encontrado');
          setLoading(false);
        }
      } catch (err) {
        console.error('[useAthleteId] Error:', err);
        if (!cancelled) {
          setError('Erro ao buscar perfil');
          setLoading(false);
        }
      }
    };

    fetchAthleteId();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void fetchAthleteId();
    });
    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { athleteId, athleteName, loading, error };
}
