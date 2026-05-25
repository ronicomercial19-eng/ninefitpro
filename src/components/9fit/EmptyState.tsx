import { LucideIcon, Sparkles, Brain, Inbox, Library, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'no-coach' | 'no-protocol' | 'ron-only' | 'no-data' | 'no-history' | 'custom';
  className?: string;
}

// "Vazio com peso" — copy editorial canônico
const PRESETS: Record<NonNullable<EmptyStateProps['variant']>, { icon: LucideIcon; title: string; description: string }> = {
  'no-coach':    { icon: UserPlus, title: 'O sistema ainda não te conhece',     description: 'Complete seu onboarding para o RON começar a calibrar.' },
  'no-protocol': { icon: Library,  title: 'Nenhum protocolo atribuído',         description: 'Explore a biblioteca ou aguarde seu coach atribuir um.' },
  'ron-only':    { icon: Brain,    title: 'RON disponível. Humanos: a caminho.', description: 'Enquanto isso, converse com seu copiloto neural.' },
  'no-data':     { icon: Sparkles, title: 'Sem dados ainda. RON está observando.', description: 'Os primeiros sinais aparecem assim que você registrar atividade.' },
  'no-history':  { icon: Inbox,    title: 'Sem histórico por aqui',             description: 'Quando você começar, sua jornada vai aparecer neste espaço.' },
  'custom':      { icon: Sparkles, title: '',                                    description: '' },
};

export function EmptyState({
  icon, title, description, actionLabel, onAction, variant = 'custom', className,
}: EmptyStateProps) {
  const preset = PRESETS[variant];
  const Icon = icon || preset.icon;
  const t = title || preset.title;
  const d = description || preset.description;

  return (
    <div className={cn(
      "rounded-2xl p-8 md:p-12 text-center bg-card/40 border border-white/[0.04] backdrop-blur-sm",
      className,
    )}>
      <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-white/10 flex items-center justify-center">
        <Icon className="w-7 h-7 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-display tracking-tight text-foreground mb-2 leading-tight">
        {t}
      </h3>
      {d && (
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {d}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-7 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold tracking-wide hover:opacity-90 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
