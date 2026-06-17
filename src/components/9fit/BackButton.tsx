import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const HIDE_ON = ["/9fit/hub", "/9fit/login", "/9fit/onboarding", "/9fit/first-access"];

/**
 * Botão fixo de voltar — aparece em todas as telas /9fit/* exceto Hub e fluxos isolados.
 * Posicionado abaixo da TopBar (top-12) e à esquerda.
 */
export function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  if (HIDE_ON.includes(location.pathname)) return null;

  return (
    <button
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/9fit/hub");
      }}
      aria-label="Voltar"
      className="fixed left-3 top-[68px] z-40 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-background/70 backdrop-blur px-3 py-1.5 text-xs font-data uppercase tracking-widest text-foreground/90 hover:border-primary/60 hover:text-primary transition"
      style={{ boxShadow: "0 4px 16px -8px rgba(232,87,26,0.35)" }}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Voltar
    </button>
  );
}
