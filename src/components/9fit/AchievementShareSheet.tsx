import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Loader2, Share2, X } from "lucide-react";
import { useAthleteId } from "@/hooks/useAthleteId";
import { useShareEvent, type ShareContentType } from "@/hooks/useShareEvent";

export type Achievement = {
  contentType: ShareContentType;
  /** Rótulo pequeno acima do título. Ex.: "NOVO RECORDE" */
  kicker: string;
  /** Título principal. Ex.: "Supino Reto (1RM)" */
  title: string;
  /** Valor em destaque. Ex.: "80 kg" */
  value?: string;
  /** Variação em relação ao anterior. Ex.: "+5 kg" */
  delta?: string;
  /** Linha de apoio. Ex.: "Teste de carga concluído" */
  subtitle?: string;
  /** Data da conquista (ISO ou Date). Padrão: hoje. */
  date?: string | Date;
  /** ID do registro real (personal_records, avaliacoes_unificadas...) para analytics. */
  contentId?: string | null;
};

/** Paleta por tipo de conquista — cores fixas em hex (renderização estável no html2canvas). */
type Theme = { accent: string; accentSoft: string; bgFrom: string; deltaColor: string; deltaBg: string; icon: string };

const THEMES: Record<ShareContentType, Theme> = {
  personal_record: { accent: "#E8571A", accentSoft: "#E8571A33", bgFrom: "#2a1206", deltaColor: "#39FF14", deltaBg: "#39FF1422", icon: "🏆" },
  assessment_completed: { accent: "#3AA0FF", accentSoft: "#3AA0FF33", bgFrom: "#08192a", deltaColor: "#3AA0FF", deltaBg: "#3AA0FF22", icon: "📊" },
  quick_workout_completed: { accent: "#FFC01E", accentSoft: "#FFC01E33", bgFrom: "#2a2206", deltaColor: "#FFC01E", deltaBg: "#FFC01E22", icon: "⚡" },
  sync_score: { accent: "#B84DFF", accentSoft: "#B84DFF33", bgFrom: "#1c0a2a", deltaColor: "#B84DFF", deltaBg: "#B84DFF22", icon: "🧬" },
  weekly_recap: { accent: "#E8571A", accentSoft: "#E8571A33", bgFrom: "#0d0d0d", deltaColor: "#39FF14", deltaBg: "#39FF1422", icon: "📅" },
  workout_completed: { accent: "#E8571A", accentSoft: "#E8571A33", bgFrom: "#2a1206", deltaColor: "#39FF14", deltaBg: "#39FF1422", icon: "💪" },
  first_workout: { accent: "#E8571A", accentSoft: "#E8571A33", bgFrom: "#2a1206", deltaColor: "#39FF14", deltaBg: "#39FF1422", icon: "🔥" },
  id_card_upgrade: { accent: "#B84DFF", accentSoft: "#B84DFF33", bgFrom: "#1c0a2a", deltaColor: "#B84DFF", deltaBg: "#B84DFF22", icon: "🪪" },
  goal_achieved: { accent: "#E8571A", accentSoft: "#E8571A33", bgFrom: "#2a1206", deltaColor: "#39FF14", deltaBg: "#39FF1422", icon: "🎯" },
  level_up: { accent: "#FFC01E", accentSoft: "#FFC01E33", bgFrom: "#2a2206", deltaColor: "#FFC01E", deltaBg: "#FFC01E22", icon: "⭐" },
  streak_7: { accent: "#E8571A", accentSoft: "#E8571A33", bgFrom: "#2a1206", deltaColor: "#39FF14", deltaBg: "#39FF1422", icon: "🔥" },
};

const CARD_W = 270; // preview 9:16 → 270 x 480

function formatDate(d?: string | Date) {
  const dt = d ? new Date(d) : new Date();
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "");
}

/** URL de deep link de convite, com origem rastreável pelo tipo de conquista. */
function inviteUrl(contentType: ShareContentType) {
  return `https://ninefitpro.lovable.app/?ref=share_${contentType}`;
}

/** QR code gerado via serviço público de imagem — sem dependência nova no bundle. */
function qrCodeSrc(url: string, accentHex: string) {
  const fg = accentHex.replace("#", "");
  const size = 84;
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&color=${fg}&bgcolor=00000000&data=${encodeURIComponent(url)}`;
}

/**
 * Card 9:16 (Stories) da conquista. Visual varia por contentType (cor de destaque, ícone,
 * gradiente de fundo) mantendo a mesma estrutura de dados. Cores fixas em hex pro html2canvas.
 */
export function AchievementStoryCard({
  a, athleteName, showName,
}: { a: Achievement; athleteName?: string | null; showName: boolean }) {
  const name = showName && athleteName ? athleteName : "Aluno 9FIT";
  const t = THEMES[a.contentType] ?? THEMES.goal_achieved;
  const url = inviteUrl(a.contentType);
  return (
    <div
      style={{
        width: CARD_W,
        aspectRatio: "9 / 16",
        background: `radial-gradient(120% 80% at 100% 100%, ${t.bgFrom} 0%, #0d0d0d 45%, #050505 100%)`,
        color: "#F2F0EC",
        border: `1px solid ${t.accent}55`,
        borderRadius: 24,
        padding: 22,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        fontFamily: "'Satoshi', 'Inter', system-ui, sans-serif",
      }}
    >
      {/* Wordmark */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 900, fontStyle: "italic", letterSpacing: "-0.02em", fontSize: 18 }}>
          9FIT<span style={{ color: t.accent }}>PRO</span>
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.3em", color: "#F2F0EC66" }}>
          {formatDate(a.date).toUpperCase()}
        </span>
      </div>

      {/* Conquista */}
      <div style={{ zIndex: 1 }}>
        <p style={{ color: t.accent, fontSize: 10, letterSpacing: "0.35em", fontWeight: 800, margin: 0 }}>
          {t.icon} {a.kicker.toUpperCase()}
        </p>
        <h2 style={{ fontWeight: 900, fontStyle: "italic", fontSize: 28, lineHeight: 1.02, letterSpacing: "-0.03em", margin: "10px 0 0" }}>
          {a.title}
        </h2>
        {a.value && (
          <p style={{ color: t.accent, fontWeight: 900, fontSize: 56, lineHeight: 1, letterSpacing: "-0.04em", margin: "18px 0 0" }}>
            {a.value}
          </p>
        )}
        {a.delta && (
          <p style={{ display: "inline-block", marginTop: 10, padding: "4px 10px", borderRadius: 999, background: t.deltaBg, color: t.deltaColor, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700 }}>
            {a.delta}
          </p>
        )}
        {a.subtitle && <p style={{ color: "#F2F0ECAA", fontSize: 12, marginTop: 12, lineHeight: 1.4 }}>{a.subtitle}</p>}
      </div>

      {/* Rodapé */}
      <div style={{ zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ fontSize: 9, letterSpacing: "0.3em", color: "#F2F0EC55", margin: 0 }}>ATLETA</p>
          <p style={{ fontWeight: 800, fontSize: 14, margin: "2px 0 0" }}>{name}</p>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "#F2F0EC55" }}>ninefitpro.lovable.app</span>
        </div>
        <img
          src={qrCodeSrc(url, t.accent)}
          crossOrigin="anonymous"
          width={42}
          height={42}
          style={{ borderRadius: 6, background: "#fff", padding: 3 }}
          alt=""
        />
      </div>

      {/* Glow */}
      <div style={{ position: "absolute", right: -70, bottom: -70, width: 200, height: 200, borderRadius: "50%", background: `${t.accent}33`, filter: "blur(40px)" }} />
    </div>
  );
}

/**
 * Bottom-sheet "Compartilhar conquista" — opcional e dispensável, nunca bloqueia o fluxo.
 * Gera PNG do card 9:16 e usa Web Share API (mobile) com fallback de download (desktop).
 */
export function AchievementShareSheet({
  achievement, onClose,
}: { achievement: Achievement | null; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { athleteName } = useAthleteId();
  const [showName, setShowName] = useState(false);
  const { share, sharing } = useShareEvent(achievement?.contentType ?? "goal_achieved");
  const canNativeShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  const handleShare = async () => {
    if (!achievement) return;
    const label = `${achievement.kicker}: ${achievement.title}${achievement.value ? ` ${achievement.value}` : ""} · 9FIT PRO`;
    const channel = await share(ref.current, label, achievement.contentId);
    if (channel) onClose();
  };

  return (
    <AnimatePresence>
      {achievement && (
        <motion.div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog" aria-label="Compartilhar conquista"
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-primary/30 bg-background p-5 pb-8 sm:pb-5 max-h-[92vh] overflow-y-auto"
            initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Conquista desbloqueada</p>
                <p className="font-display text-xl">Compartilhar nos Stories</p>
              </div>
              <button onClick={onClose} aria-label="Fechar" className="w-8 h-8 rounded-lg border border-white/10 grid place-items-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center">
              <div ref={ref}>
                <AchievementStoryCard a={achievement} athleteName={athleteName} showName={showName} />
              </div>
            </div>

            <label className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
              <span>Mostrar meu nome no card</span>
              <input
                type="checkbox"
                checked={showName}
                onChange={(e) => setShowName(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
            </label>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleShare}
                disabled={sharing}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground font-bold py-3 disabled:opacity-50"
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : canNativeShare ? <Share2 className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {canNativeShare ? "Compartilhar" : "Baixar imagem"}
              </button>
              <button onClick={onClose} className="w-full rounded-full border border-white/15 py-3 text-sm text-muted-foreground hover:bg-white/[0.04]">
                Agora não
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
