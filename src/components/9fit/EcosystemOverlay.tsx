import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { EcosystemGrid } from "./EcosystemGrid";

interface EcosystemOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function EcosystemOverlay({ open, onClose }: EcosystemOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md p-4 pt-12 overflow-y-auto"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-8">Ecosistema</h2>
            <EcosystemGrid showHeader={false} showAll={true} variant="grid" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
