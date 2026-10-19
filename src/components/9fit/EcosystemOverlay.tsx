import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 pt-12 overflow-y-auto"
          role="dialog" aria-modal="true" aria-label="Explorar ecossistema"
          ref={dialogRef}
        >
          <button
            onClick={onClose}
            aria-label="Fechar ecossistema"
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-2xl mx-auto min-h-full flex flex-col justify-center">
            {loading && <p role="status">Carregando módulos…</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && !modules.length && <p>Nenhum módulo ativo disponível.</p>}
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
                  className="bg-card p-6 rounded-3xl border border-white/10 relative w-full"
                >
                  <h3 className="text-3xl font-bold text-white mb-4">{selectedModule.name}</h3>
                  <p className="text-neutral-400 mb-6">{selectedModule.description}</p>
                  <ModuleExperience moduleKey={selectedModule.key} name={selectedModule.name} />
                  {moduleRoute(selectedModule) && <button type="button" className="w-full rounded-xl bg-primary text-primary-foreground p-3 mt-4" onClick={() => { onClose(); navigate(moduleRoute(selectedModule)!); }}>Acessar {selectedModule.name} completo →</button>}

                  <div className="flex justify-between items-center mt-auto">
                    <button aria-label="Módulo anterior" onClick={() => paginate(-1)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="font-mono text-xs text-neutral-500">{currentIndex + 1} / {modules.length}</span>
                    <button aria-label="Próximo módulo" onClick={() => paginate(1)} className="p-3 rounded-full bg-primary hover:bg-primary/80 text-black">
                      <ChevronRight className="w-6 h-6" />
                    </button>
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
