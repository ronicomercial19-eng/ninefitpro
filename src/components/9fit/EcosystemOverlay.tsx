import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { EcosystemGrid } from "./EcosystemGrid";
import { useState } from "react";

// You might want to move this to a shared types file
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
  const [selectedModule, setSelectedModule] = useState<PhysioModule | null>(null);

  // Variantes de movimento para controle fino da transição
  const containerVariants = {
    hidden: { opacity: 0, y: "100%" },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", damping: 25, stiffness: 200 }
    },
    exit: { 
      opacity: 0, 
      y: "100%",
      transition: { type: "spring", damping: 30, stiffness: 200 }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 pt-12 overflow-y-auto"
        >
          <button
            onClick={() => selectedModule ? setSelectedModule(null) : onClose()}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              {selectedModule ? (
                <motion.div
                  key={selectedModule.id}
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="bg-card p-6 rounded-2xl border border-white/10"
                >
                  <h3 className="text-2xl font-bold text-white mb-4">{selectedModule.name}</h3>
                  <p className="text-neutral-400 mb-6">{selectedModule.description}</p>
                  {selectedModule.iframe_url ? (
                    <iframe src={selectedModule.iframe_url} className="w-full h-96 rounded-xl" />
                  ) : (
                    <div className="text-white">Conteúdo do {selectedModule.name} aqui.</div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  variants={contentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-8">Ecosistema</h2>
                    <EcosystemGrid showHeader={false} showAll={true} variant="grid" onModuleSelect={(m) => { setSelectedModule(m); }} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
