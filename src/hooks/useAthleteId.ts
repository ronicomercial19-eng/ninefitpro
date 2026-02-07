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
    const fetchAthleteId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
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
          setAthleteId(directAthlete.id);
          setAthleteName(directAthlete.name);
          setLoading(false);
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
          
          setAthleteId(linkData.athlete_id);
          setAthleteName(athlete?.name || null);
          setLoading(false);
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
            setAthleteId(emailAthlete.id);
            setAthleteName(emailAthlete.name);
            setLoading(false);
            return;
          }
        }

        console.log('[useAthleteId] No athlete found for this user');
        setError('Perfil de atleta não encontrado');
        setLoading(false);
      } catch (err) {
        console.error('[useAthleteId] Error:', err);
        setError('Erro ao buscar perfil');
        setLoading(false);
      }
    };

    fetchAthleteId();
  }, []);

  return { athleteId, athleteName, loading, error };
}
