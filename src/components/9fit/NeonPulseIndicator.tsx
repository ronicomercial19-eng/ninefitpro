import { motion } from "framer-motion";

export type NeonMonitoringState = "updated_now" | "recent_activity" | "active";

export interface NeonPulseIndicatorProps {
  /**
   * Estado de monitoramento do card:
   * - "updated_now": 'Atualizado Agora' (pulso neon laranja/branco vibrante)
   * - "recent_activity": 'Atividade Recente' (pulso sutil e calmo)
   * - "active": 'Ativo'
   */
  state?: NeonMonitoringState;
  /**
   * Texto customizado do rótulo. Se não fornecido, usa o padrão do estado.
   */
  label?: string;
  /**
   * Exibir texto do rótulo junto ao círculo neon (padrão: true)
   */
  showLabel?: boolean;
  /**
   * Paleta visual com foco no tema Orange/White
   * - "orange": Núcleo laranja com halo branco/laranja
   * - "white": Núcleo branco com halo neon laranja
   */
  variant?: "orange" | "white";
  /**
   * Tamanho do indicador neon
   */
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function NeonPulseIndicator({
  state = "updated_now",
  label,
  showLabel = true,
  variant = "white",
  size = "sm",
  className = "",
}: NeonPulseIndicatorProps) {
  const isUpdatedNow = state === "updated_now";
  const defaultLabel = isUpdatedNow ? "Atualizado Agora" : "Atividade Recente";
  const displayLabel = label ?? defaultLabel;

  // Configuração de tamanhos
  const dotSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
  };

  const ringSizes = {
    xs: "h-3.5 w-3.5",
    sm: "h-4 w-4",
    md: "h-5 w-5",
  };

  const textSizes = {
    xs: "text-[8.5px]",
    sm: "text-[9.5px]",
    md: "text-[10.5px]",
  };

  // Cores estritas do tema 9FIT: Orange (#FF6600 / #FF7700) e White (#FFFFFF)
  const isOrangeVariant = variant === "orange";

  return (
    <div
      role="status"
      aria-label={`Status de monitoramento: ${displayLabel}`}
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 backdrop-blur-md transition-all duration-300 ${
        isUpdatedNow
          ? "bg-black/60 border border-[#FF6600]/30 shadow-[0_0_14px_rgba(255,102,0,0.18)]"
          : "bg-black/40 border border-white/15 shadow-[0_0_10px_rgba(255,255,255,0.08)]"
      } ${className}`}
    >
      {/* Sistema de Círculo Neon em Múltiplas Camadas (Pulsando Levemente) */}
      <div className={`relative flex items-center justify-center ${ringSizes[size]}`}>
        {/* Onda 1: Pulso externo de expansão suave */}
        <motion.span
          className="absolute inset-0 rounded-full bg-[#FF6600]"
          initial={{ scale: 0.9, opacity: 0.5 }}
          animate={{
            scale: [0.9, 1.8, 2.2],
            opacity: [0.65, 0.25, 0],
          }}
          transition={{
            duration: isUpdatedNow ? 2.2 : 2.8,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />

        {/* Onda 2: Halo sutil respirante sincronizado (Orange / White) */}
        <motion.span
          className={`absolute rounded-full filter blur-[2px] ${
            isOrangeVariant
              ? "bg-[#FF6600]/60"
              : "bg-white/70"
          }`}
          style={{
            width: "120%",
            height: "120%",
          }}
          animate={{
            opacity: [0.4, 0.85, 0.4],
            scale: [0.95, 1.15, 0.95],
          }}
          transition={{
            duration: isUpdatedNow ? 1.8 : 2.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Núcleo do Círculo Neon: Branco com Borda Neon Laranja e Glow */}
        <span
          className={`relative z-10 rounded-full transition-all duration-300 ${dotSizes[size]} ${
            isOrangeVariant
              ? "bg-[#FF6600] shadow-[0_0_8px_#FF6600,0_0_12px_rgba(255,255,255,0.6)]"
              : "bg-white shadow-[0_0_6px_#FFFFFF,0_0_12px_#FF6600,0_0_18px_rgba(255,102,0,0.5)] border border-[#FF6600]/60"
          }`}
        />
      </div>

      {/* Rótulo de Monitoramento com Tipografia Técnica */}
      {showLabel && (
        <span
          className={`font-mono uppercase font-bold tracking-wider leading-none select-none truncate ${textSizes[size]} ${
            isUpdatedNow
              ? "text-orange-300 group-hover:text-white transition-colors"
              : "text-neutral-200"
          }`}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
}
