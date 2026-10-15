import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { moduleRoute } from "@/lib/moduleRoute";
import { ModuleExperience } from "./ModuleExperience";

interface PhysioModule {
  id: string;
  key: string;
  name: string;
  description: string;
  hero_image: string | null;
  cta_label: string;
  cta_route: string | null;
  category: string;
  display_order: number;
  connector_key: string | null;
  iframe_url?: string | null;
}

interface EcosystemOverlayProps {
  open: boolean;
  onClose: () => void;
  initialModuleKey?: string | null;
}

// Padrão Nine Pro v2 (referência: card TRIBOS): o módulo atual é o único hero da tela.
const eyebrow = "font-data text-[10px] uppercase tracking-[0.4em] text-primary/80";
const pillPrimary = "inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-display text-xs font-black uppercase tracking-wider text-primary-foreground transition-transform active:scale-95";

export function EcosystemOverlay({ open, onClose, initialModuleKey }: EcosystemOverlayProps) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<PhysioModule[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for prev

  useEffect(() => {
    let active=true;
    if (open) {
      async function fetchModules() {
        setLoading(true); setError(null); setModules([]); setCurrentIndex(0);
        const { data, error } = await supabase
          .from("physio_modules")
          .select("*")
          .eq("status", "active")
          .order("display_order");
        if (!active) return;
        if (data) { setModules(data as PhysioModule[]); setCurrentIndex(Math.max(0, data.findIndex(module => module.key.replace(/[-_]/g, '') === initialModuleKey?.replace(/[-_]/g, '')))); }
        if (error) setError("Não foi possível carregar os módulos. Feche e tente novamente.");
        setLoading(false);
      }
      fetchModules();
    }
    return () => { active=false; };
  }, [open, initialModuleKey]);

  useEffect(() => {
    if (!open) return;
    const focused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, textarea, select, a[href], iframe') || []).filter(element => element.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', close); focused?.focus(); };
  }, [open, onClose]);

  const paginate = (newDirection: number) => {
    if (!modules.length) return;
    setDirection(newDirection);
    setCurrentIndex((prev) => (prev + newDirection + modules.length) % modules.length);
  };

  const selectedModule = modules[currentIndex];
  const pad = (n: number) => String(n).padStart(2, "0");

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence initial={false} custom={direction}>
      {open && (
        <motion.div
          variants={{
            hidden: { opacity: 0, y: "100%" },
            visible: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: "100%" }
          }}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/95 p-4 pt-14 backdrop-blur-md"
          role="dialog" aria-modal="true" aria-label="Explorar ecossistema"
          ref={dialogRef}
        >
          <button
            onClick={onClose}
            aria-label="Fechar ecossistema"
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground transition-colors hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center">
            {loading && <p role="status" className="text-sm text-muted-foreground">Carregando módulos…</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {!loading && !error && !modules.length && <p className="text-sm text-muted-foreground">Nenhum módulo ativo disponível.</p>}
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              {selectedModule && (
                <motion.div
                  key={selectedModule.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="relative w-full overflow-hidden rounded-2xl border border-primary/20 bg-black p-5"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsla(20,100%,50%,0.2),transparent_60%)]" />

                  <div className="relative z-10 space-y-5">
                    <div>
                      <p className={eyebrow}>{pad(currentIndex + 1)} / {pad(modules.length)} · {selectedModule.category}</p>
                      <h3
                        className="mt-2 break-words font-display font-black uppercase leading-none tracking-tighter"
                        style={{ WebkitTextStroke: "1.5px hsl(20 100% 50%)", color: "transparent", fontSize: "clamp(36px, 12vw, 72px)" }}
                      >
                        {selectedModule.name}
                      </h3>
                      <p className="mt-3 text-sm text-muted-foreground">{selectedModule.description}</p>
                    </div>

                    <ModuleExperience moduleKey={selectedModule.key} name={selectedModule.name} />

                    {moduleRoute(selectedModule) && (
                      <button type="button" className={pillPrimary} onClick={() => { onClose(); navigate(moduleRoute(selectedModule)!); }}>
                        Acessar {selectedModule.name} completo <ArrowUpRight className="h-4 w-4" />
                      </button>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button aria-label="Módulo anterior" onClick={() => paginate(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-foreground transition-colors hover:bg-white/10">
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="font-data text-[10px] uppercase tracking-[0.4em] text-muted-foreground">{pad(currentIndex + 1)} / {pad(modules.length)}</span>
                      <button aria-label="Próximo módulo" onClick={() => paginate(1)} className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95">
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
