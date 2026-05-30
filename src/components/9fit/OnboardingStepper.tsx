import { motion } from "framer-motion";
import { Check } from "lucide-react";

export interface StepDef { key: string; label: string; }

export function OnboardingStepper({ steps, currentIndex }: { steps: StepDef[]; currentIndex: number }) {
  return (
    <div className="space-y-3">
      <p className="text-center text-[10px] tracking-[0.3em] uppercase text-muted-foreground">
        Step-by-step guided setup
      </p>
      <div className="flex items-center justify-between gap-1">
        {steps.map((s, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <div key={s.key} className="flex-1 flex items-center">
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: done || active ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    scale: active ? 1.08 : 1,
                  }}
                  className="w-9 h-9 rounded-md grid place-items-center text-xs font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.45)]"
                >
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </motion.div>
                <span className={`text-[9px] tracking-widest uppercase ${active ? "text-primary" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-[2px] mx-1 ${i < currentIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
