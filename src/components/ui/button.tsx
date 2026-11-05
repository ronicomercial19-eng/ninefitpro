import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
 * Nine: cantos cortados, cor chapada, sem brilho.
 * default e destructive usam .cut (clip-path). outline e secondary usam .cut-b,
 * que desenha a borda também na diagonal. Um botão default por tela ou card.
 * Veja src/styles/nine-art-direction.css.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold transition-[background-color,color,filter,transform] duration-150 ease-out active:scale-[.98] focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "cut bg-primary text-primary-foreground hover:brightness-95",
        destructive:
          "cut bg-destructive text-destructive-foreground hover:brightness-95",
        outline:
          "cut-b text-foreground [--cut-line:color-mix(in_srgb,hsl(var(--primary))_50%,transparent)] [--cut-fill:hsl(var(--background))] hover:[--cut-fill:color-mix(in_srgb,hsl(var(--primary))_12%,hsl(var(--background)))]",
        secondary:
          "cut-b text-secondary-foreground [--cut-line:hsl(var(--border))] [--cut-fill:hsl(var(--secondary))] hover:[--cut-fill:color-mix(in_srgb,hsl(var(--foreground))_8%,hsl(var(--secondary)))]",
        ghost: "text-primary hover:bg-primary/10",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-10 px-4",
        lg: "h-12 px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
