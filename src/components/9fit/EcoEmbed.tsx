import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

export function EcoEmbed({ title, url, backTo = "/9fit/profile" }: { title: string; url: string; backTo?: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/80 backdrop-blur">
        <span className="text-[11px] font-display tracking-[0.3em] uppercase text-primary">{title}</span>
        <button onClick={() => navigate(backTo)} className="p-2 rounded-full hover:bg-white/10" aria-label="Fechar">
          <X className="w-5 h-5 text-foreground" />
        </button>
      </header>
      <iframe
        src={url}
        title={title}
        className="flex-1 w-full bg-black"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
        allow="autoplay; fullscreen; clipboard-write"
      />
    </div>
  );
}
