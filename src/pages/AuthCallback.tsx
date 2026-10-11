import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { resolveLoginDestination } from '@/services/loginDestination.service';
export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) { if (active) navigate('/9fit/login', { replace: true }); return; }
        const destination = await resolveLoginDestination(data.user.id);
        if (active) navigate(destination, { replace: true });
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [navigate, retry]);
  return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6" role={error ? 'alert' : 'status'}>
    <p>{error ? 'Não foi possível carregar seu acesso.' : 'Preparando seu início…'}</p>
    {error && <><button onClick={() => setRetry(value => value + 1)}>Tentar novamente</button><a href="/9fit/login">Entrar novamente</a></>}
  </main>;
}
