import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Nine: chip com canto cortado de 6px.
 * Semântica de cor: ativo = online/conectado/ok, ia = conteúdo gerado por IA,
 * fogo = alerta ou indisponível, prime = só o tier PRIME.
 */
const badgeVariants = cva(
  "cut cut-sm inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground",
        ativo: "border-transparent bg-ativo/15 text-ativo",
        ia: "border-transparent bg-ia/25 text-[hsl(332_73%_66%)]",
        fogo: "border-fogo/40 bg-fogo/10 text-fogo",
        prime: "border-transparent bg-prime/20 text-[hsl(276_62%_72%)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
