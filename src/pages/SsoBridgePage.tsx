import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasAssessment } from '@/services/assessmentService';
import { Skeleton } from '@/components/ui/skeleton';

const SsoBridgePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRoute = async () => {
      if (!authLoading && user) {
        try {
          // Resolver athlete_id via athlete_auth_link
          const has_assessment = await hasAssessment(user.id);

          if (has_assessment) {
            // Tem avaliação → ir para dashboard
            navigate('/');
          } else {
            // Sem avaliação → ir para seleção de avaliação
            navigate('/avaliacao-guiada/select');
          }
        } catch (err) {
          console.error('Error checking assessment:', err);
          navigate('/');
        }
      }
      setChecking(false);
    };

    checkAndRoute();
  }, [user, authLoading, navigate]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 max-w-sm">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return null;
};

export default SsoBridgePage;
