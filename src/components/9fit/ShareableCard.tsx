import { useRef } from "react";
import { Share2, Loader2 } from "lucide-react";
import { useShareEvent, type ShareContentType } from "@/hooks/useShareEvent";

interface Props {
  contentType: ShareContentType;
  title: string;
  subtitle?: string;
  stat?: { label: string; value: string | number };
  accent?: string; // hex
}

/**
 * Card visual de conquista para viralização.
 * Logo 9FIT discreto no canto — foco é a conquista pessoal.
 */
export function ShareableCard({ contentType, title, subtitle, stat, accent = "#E8571A" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { share, sharing } = useShareEvent(contentType);

  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="rounded-3xl overflow-hidden relative p-6 text-left"
        style={{
          background: "linear-gradient(135deg, #0a0a0a 0%, #131313 60%, #1a0d05 100%)",
          color: "#F2F0EC",
          border: `1px solid ${accent}40`,
          minHeight: 320,
          boxShadow: `0 0 60px ${accent}33 inset`,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <span style={{ color: accent }} className="text-[10px] font-bold tracking-[0.35em] uppercase">
            9FIT
          </span>
          <span className="text-[10px] font-data tracking-widest text-white/40">
            {new Date().toLocaleDateString("pt-BR")}
          </span>
        </div>
        <h2 style={{ fontFamily: "Syne, system-ui", fontWeight: 800, lineHeight: 1.05 }} className="text-3xl mb-3">
          {title}
        </h2>
        {subtitle && <p className="text-sm text-white/70 mb-6 max-w-[300px]">{subtitle}</p>}
        {stat && (
          <div className="absolute bottom-6 left-6">
            <p className="text-[10px] tracking-widest uppercase text-white/40">{stat.label}</p>
            <p style={{ color: accent, fontFamily: "Syne, system-ui", fontWeight: 800 }} className="text-5xl">
              {stat.value}
            </p>
          </div>
        )}
        <div
          className="absolute -bottom-20 -right-20 w-60 h-60 rounded-full"
          style={{ background: `${accent}22`, filter: "blur(40px)" }}
        />
      </div>
      <button
        onClick={() => share(ref.current, title)}
        disabled={sharing}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-bold py-3 disabled:opacity-50"
      >
        {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        Compartilhar conquista
      </button>
    </div>
  );
}
