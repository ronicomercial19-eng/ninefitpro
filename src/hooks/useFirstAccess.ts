import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseFirstAccessResult {
  isFirstAccess: boolean;
  isLoading: boolean;
  athleteId: string | null;
}

export function useFirstAccess(): UseFirstAccessResult {
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    const checkFirstAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Check if user is linked to an athlete
        const { data: link } = await supabase
          .from('athlete_auth_link')
          .select('athlete_id')
          .eq('user_id', user.id)
          .single();

        if (!link) {
          // Not an athlete, no first access flow needed
          setIsLoading(false);
          return;
        }

        setAthleteId(link.athlete_id);

        // Check if password has been changed
        const { data: athlete } = await supabase
          .from('athletes')
          .select('password_changed, auto_password_temp')
          .eq('id', link.athlete_id)
          .single();

        // If password_changed is false and there's a temp password, it's first access
        const needsFirstAccess = athlete?.password_changed === false && 
                                  athlete?.auto_password_temp !== null;
        
        setIsFirstAccess(needsFirstAccess);
      } catch (error) {
        console.error('Error checking first access:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkFirstAccess();
  }, []);

  return { isFirstAccess, isLoading, athleteId };
}
