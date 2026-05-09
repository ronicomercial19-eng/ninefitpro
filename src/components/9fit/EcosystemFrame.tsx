import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface EcosystemFrameProps {
  url: string;
  title: string;
  /** Pass auth tokens via URL params (Sovereign pattern) */
  passSession?: boolean;
  onBack?: () => void;
}

/**
 * Wraps an external 9FIT ecosystem app in a unified frame so it feels native.
 * - 9FIT header on top
 * - Loading skeleton with glow
 * - Optional SSO via ?access_token=...&user_id=...
 * - Fallback "Open externally" if iframe blocked
 */
export function EcosystemFrame({ url, title, passSession = true, onBack }: EcosystemFrameProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authedUrl, setAuthedUrl] = useState(url);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let canceled = false;
    const build = async () => {
      if (!passSession) { setAuthedUrl(url); return; }
      try {
        const { data } = await supabase.auth.getSession();
        const s = data.session;
        if (!s) { setAuthedUrl(url); return; }
        const sep = url.includes("?") ? "&" : "?";
        const next = `${url}${sep}access_token=${encodeURIComponent(s.access_token)}&refresh_token=${encodeURIComponent(s.refresh_token)}&user_id=${encodeURIComponent(s.user.id)}`;
        if (!canceled) setAuthedUrl(next);
      } catch {
        setAuthedUrl(url);
      }
    };
    build();
    return () => { canceled = true; };
  }, [url, passSession]);

  // Detect blocked iframes after timeout
  useEffect(() => {
    const t = setTimeout(() => {
      if (loading) setBlocked(true);
    }, 8000);
    return () => clearTimeout(t);
  }, [loading]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-in">
      <header className="flex items-center justify-between px-4 h-14 border-b border-border glass">
        <button
          onClick={() => onBack ? onBack() : navigate(-1)}
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-display uppercase tracking-widest">Voltar</span>
        </button>
        <div className="text-center">
          <p className="text-[9px] font-data uppercase tracking-[0.2em] text-muted-foreground">9FIT ·</p>
          <h1 className="text-sm font-display uppercase tracking-tight text-foreground">{title}</h1>
        </div>
        <a
          href={authedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors"
          aria-label="Abrir externo"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </header>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin glow-neon" />
            <p className="text-xs font-data uppercase tracking-widest text-muted-foreground">
              Conectando ao ecossistema
            </p>
          </div>
        )}
        {blocked ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-foreground font-display uppercase">App externo bloqueou o frame</p>
            <p className="text-xs text-muted-foreground">Abra direto no navegador para continuar.</p>
            <a
              href={authedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-neon px-6 py-3 rounded-sm flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir {title}
            </a>
          </div>
        ) : (
          <iframe
            src={authedUrl}
            title={title}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            allow="camera; microphone; clipboard-write; fullscreen"
          />
        )}
      </div>
    </div>
  );
}
