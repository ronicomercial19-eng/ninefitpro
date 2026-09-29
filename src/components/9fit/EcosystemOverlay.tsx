import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

export function EcosystemOverlay({ open, onClose }: EcosystemOverlayProps) {
  const [modules, setModules] = useState<PhysioModule[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 for next, -1 for prev

  useEffect(() => {
    if (open) {
      async function fetchModules() {
        const { data } = await supabase
          .from("physio_modules")
          .select("*")
          .eq("status", "active")
          .order("display_order");
        if (data) setModules(data as PhysioModule[]);
      }
      fetchModules();
    }
  }, [open]);

  const paginate = (newDirection: number) => {
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
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-xl mx-auto h-full flex flex-col justify-center">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              {selectedModule && (
                <motion.div
                  key={selectedModule.id}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x;
                    if (swipe < -100) paginate(1);
                    else if (swipe > 100) paginate(-1);
                  }}
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                  className="bg-card p-6 rounded-3xl border border-white/10 relative w-full"
                >
                  <h3 className="text-3xl font-bold text-white mb-4">{selectedModule.name}</h3>
                  <p className="text-neutral-400 mb-6">{selectedModule.description}</p>
                  
                  {selectedModule.iframe_url ? (
                    <iframe src={selectedModule.iframe_url} className="w-full h-80 rounded-2xl mb-6" />
                  ) : (
                    <div className="h-80 w-full bg-white/5 rounded-2xl mb-6 flex items-center justify-center text-white">Conteúdo do {selectedModule.name}</div>
                  )}

                  <div className="flex justify-between items-center mt-auto">
                    <button onClick={() => paginate(-1)} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white">
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <span className="font-mono text-xs text-neutral-500">{currentIndex + 1} / {modules.length}</span>
                    <button onClick={() => paginate(1)} className="p-3 rounded-full bg-primary hover:bg-primary/80 text-black">
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
