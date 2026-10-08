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

const clip = (text: string | undefined, max: number) =>
  text && text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

/**
 * Card visual de conquista para compartilhar.
 * Formato fixo 4:5 (feed), layout em coluna (sem elementos sobrepostos) e só recursos que o html2canvas
 * exporta fielmente: sem `filter: blur` nem `aspect-ratio` — o brilho é um radial-gradient e a proporção
 * vem de padding percentual. O que aparece na tela é o que sai na imagem.
 */
export function ShareableCard({ contentType, title, subtitle, stat, accent = "#E8571A" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { share, sharing } = useShareEvent(contentType);

  const safeTitle = clip(title, 70) || "";
  const safeSubtitle = clip(subtitle, 140);
  const titleSize = safeTitle.length > 40 ? 24 : safeTitle.length > 22 ? 28 : 34;

  return (
    <div className="space-y-3">
      <div style={{ width: "100%", maxWidth: 360, margin: "0 auto" }}>
        <div
          ref={ref}
          style={{
            position: "relative",
            width: "100%",
            paddingBottom: "125%",
            borderRadius: 24,
            overflow: "hidden",
            color: "#F2F0EC",
            border: `1px solid ${accent}55`,
            background: `radial-gradient(circle at 90% 105%, ${accent}40 0%, ${accent}14 32%, transparent 62%), linear-gradient(160deg, #0b0b0c 0%, #151311 100%)`,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              textAlign: "left",
            }}
          >
            {/* Topo: marca e data */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 18, height: 3, borderRadius: 2, background: accent, display: "inline-block" }} />
                <span style={{ color: accent, fontSize: 11, fontWeight: 800, letterSpacing: "0.32em", textTransform: "uppercase" }}>9FIT</span>
              </div>
              <span style={{ fontSize: 11, letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)" }}>
                {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>

            {/* Meio: conquista */}
            <div>
              <h2
                style={{
                  fontFamily: "Syne, system-ui, sans-serif",
                  fontWeight: 800,
                  fontSize: titleSize,
                  lineHeight: 1.08,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  wordBreak: "break-word",
                }}
              >
                {safeTitle}
              </h2>
              {safeSubtitle && (
                <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.45, color: "rgba(255,255,255,0.72)" }}>
                  {safeSubtitle}
                </p>
              )}
            </div>

            {/* Base: número e assinatura */}
            <div>
              {stat && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ margin: 0, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
                    {stat.label}
                  </p>
                  <p style={{ margin: "2px 0 0", color: accent, fontFamily: "Syne, system-ui, sans-serif", fontWeight: 800, fontSize: 52, lineHeight: 1 }}>
                    {stat.value}
                  </p>
                </div>
              )}
              <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 10 }} />
              <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}>
                Meu progresso no 9FIT
              </p>
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={() => ref.current && share(ref.current, { label: title })}
        disabled={sharing}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-bold py-3 disabled:opacity-50"
      >
        {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
        Compartilhar conquista
      </button>
    </div>
  );
}
