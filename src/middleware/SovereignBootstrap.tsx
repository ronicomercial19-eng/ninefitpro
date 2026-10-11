import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveLoginDestination } from '@/services/loginDestination.service';
import { cleanAuthUrl, readIncomingAuth, tokenMatchesProject } from '@/lib/authTokens';

const PUBLIC_ROUTES = ['/', '/auth', '/auth/callback', '/login', '/register', '/forgot-password', '/9fit/login', '/9fit', '/9fit/onboarding', '/9fit/first-access', '/sales', '/suporte', '/whatsapp-redirect', '/assessment'];
type Outcome = 'ready' | 'error';
// StrictMode/remounts must not consume the same refresh token twice.
let bootstrap: Promise<Outcome> | undefined;
async function establishSession(): Promise<Outcome> {
  const url = window.location.href;
  const incoming = readIncomingAuth(url);
  if (incoming.kind !== 'none') {
    window.history.replaceState({}, '', cleanAuthUrl(url));
    if (incoming.kind !== 'session' || !tokenMatchesProject(incoming.accessToken, 'https://mfrydtrzjxscbkaiwfnw.supabase.co')) return 'error';
    try {
      const { data, error } = await supabase.auth.setSession({ access_token: incoming.accessToken, refresh_token: incoming.refreshToken });
      if (error || !data.session) return 'error';
      const verified = await supabase.auth.getUser();
      if (verified.error || !verified.data.user) return 'error';
      window.history.replaceState({}, '', await resolveLoginDestination(verified.data.user.id));
      return 'ready';
    } catch { return 'error'; }
  }
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return 'error';
    if (data.session || PUBLIC_ROUTES.includes(window.location.pathname)) return 'ready';
    // The direct login remains available if the central portal is unavailable.
    window.location.replace('/9fit/login');
    return 'ready';
  } catch { return 'error'; }
}
export function SovereignBootstrap({ children }: { children: React.ReactNode }) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  useEffect(() => {
    let active = true;
    bootstrap ??= establishSession();
    void bootstrap.then(result => { if (active) setOutcome(result); });
    return () => { active = false; };
  }, []);
  if (outcome === 'error') return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <section className="max-w-md text-center space-y-5" role="alert">
        <h1 className="text-2xl font-bold">Vamos retomar seu acesso</h1>
        <p>Não conseguimos validar o acesso recebido do portal. Entre diretamente na 9FIT PRO com sua senha atual.</p>
        <a href="/9fit/login" className="block rounded-lg bg-primary p-4 text-primary-foreground">Entrar na 9FIT PRO</a>
        <button onClick={() => window.location.reload()} className="underline">Tentar novamente</button>
      </section>
    </main>
  );
  if (!outcome) return <div className="min-h-screen bg-background text-foreground flex items-center justify-center" role="status">Validando seu acesso…</div>;
  return <>{children}</>;
}
