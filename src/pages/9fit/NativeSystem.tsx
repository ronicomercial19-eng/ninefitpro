import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, MessageCircle, Sparkles } from "lucide-react";
import { getEmbeddedApp } from "@/data/ecosystemApps";

export default function NineFitNativeSystem() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const appKey = params.get("app") ?? "fitness-place";
  const app = getEmbeddedApp(appKey) ?? getEmbeddedApp("fitness-place")!;

  // Sem URL nativa ainda → mostra fallback (em integração + WhatsApp)
  const showFallback = !app.url;

  return (
    <div className="fixed inset-0 bg-background flex flex-col z-50">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-primary/30 bg-black/80">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-lg border border-white/10 grid place-items-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Sistema Nativo</p>
          <p className="font-display text-sm truncate">{app.label}</p>
        </div>
        {app.url && (
          <a href={app.url} target="_blank" rel="noreferrer"
            className="w-9 h-9 rounded-lg border border-primary/40 grid place-items-center text-primary">
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </header>

      {showFallback ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-center">
          <div className="w-20 h-20 rounded-full border border-primary/40 grid place-items-center">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl">{app.label} em integração</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              {app.description ?? "Este módulo será disponibilizado de forma nativa em breve."}
            </p>
          </div>
          {app.fallback?.type === "whatsapp" && (
            <a
              href={`https://wa.me/${app.fallback.phone}?text=${encodeURIComponent(app.fallback.message)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground font-semibold px-5 py-3"
            >
              <MessageCircle className="w-4 h-4" /> Falar no WhatsApp
            </a>
          )}
        </div>
      ) : (
        <iframe
          src={app.url}
          title={app.label}
          className="flex-1 w-full border-0 bg-black"
          allow={app.allow ?? "clipboard-write; fullscreen"}
        />
      )}
    </div>
  );
}
