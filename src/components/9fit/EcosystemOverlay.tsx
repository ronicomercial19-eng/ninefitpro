import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { EcosystemGrid } from "./EcosystemGrid";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
          className="fixed inset-0 z-[75] bg-[#050505]/95 backdrop-blur-xl p-4 pt-12 overflow-y-auto"
        >
          <button
            onClick={() => selectedModule ? setSelectedModule(null) : onClose()}
            className="absolute top-4 right-4 z-10 p-2 rounded-full border border-white/10 bg-white/10 hover:bg-white/20 transition-colors text-white"
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
                  className="bg-[#0f0f0f] p-6 rounded-3xl border border-primary/25 shadow-2xl shadow-black/60"
                >
                  <h3 className="text-2xl font-bold text-white mb-4">{selectedModule.name}</h3>
                  <p className="text-neutral-400 mb-6">{selectedModule.description}</p>
                  {selectedModule.iframe_url ? (
                    <iframe src={selectedModule.iframe_url} title={selectedModule.name} className="w-full h-[62dvh] rounded-2xl border border-white/10 bg-black" />
                  ) : selectedModule.cta_route ? (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedModule.cta_route as string;
                        onClose();
                        setSelectedModule(null);
                        if (/^https?:\/\//i.test(target)) {
                          navigate(`/9fit/embed?url=${encodeURIComponent(target)}&title=${encodeURIComponent(selectedModule.name)}`);
                        } else {
                          navigate(target);
                        }
                      }}
                      className="w-full rounded-2xl border border-primary/30 bg-primary/[0.08] hover:bg-primary/15 px-4 py-4 text-left text-white transition flex items-center justify-between gap-3"
                    >
                      <span>
                        <span className="block text-sm font-bold">Abrir {selectedModule.name}</span>
                        <span className="block text-xs text-muted-foreground mt-0.5">Mantém a sessão ativa e entra no módulo funcional.</span>
                      </span>
                      {/^(https?:)?\/\//i.test(selectedModule.cta_route || "") ? <ExternalLink className="w-5 h-5 text-primary" /> : <ArrowRight className="w-5 h-5 text-primary" />}
                    </button>
                  ) : (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-muted-foreground">Módulo disponível, mas sem rota configurada.</div>
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
                    <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.28 }} className="mb-8 rounded-3xl border border-primary/20 bg-primary/[0.06] p-5 shadow-[0_20px_70px_-36px_hsl(var(--primary)/0.75)]">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">9FIT ECOSYSTEM</p>
                      <h2 className="mt-1 text-3xl font-black italic uppercase tracking-tighter text-white">Todos os módulos</h2>
                      <p className="mt-1 text-xs text-muted-foreground">Escolha o módulo e entre direto mantendo sua sessão ativa.</p>
                    </motion.div>
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
