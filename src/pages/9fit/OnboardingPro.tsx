import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CompleteProfileFlow } from "@/components/9fit/CompleteProfileFlow";
import { PDIWizard } from "@/components/9fit/PDIWizard";
import { WearableConnectBox } from "@/components/9fit/WearableConnectBox";
import { motion, AnimatePresence } from "framer-motion";

export default function OnboardingPro() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"profile" | "pdi" | "wearable">("profile");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === "profile" && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">Vamos completar seu perfil físico</h1>
            <CompleteProfileFlow open={true} onClose={() => setStep("pdi")} />
          </motion.div>
        )}
        {step === "pdi" && (
          <motion.div key="pdi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
            <h1 className="text-2xl font-bold mb-6 text-center">Calibrando sua IA PDI</h1>
            <PDIWizard open={true} onClose={() => setStep("wearable")} />
          </motion.div>
        )}
        {step === "wearable" && (
          <motion.div key="wearable" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-6">
            <h1 className="text-2xl font-bold text-center">Conecte seu dispositivo</h1>
            <WearableConnectBox />
            <button
              onClick={() => navigate("/9fit/hub")}
              className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-lg"
            >
              Finalizar e Ir para o Hub
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
