import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Stub — Onboarding legado foi absorvido pelo fluxo único /9fit/ativacao.
 */
export default function NineFitOnboarding() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/9fit/ativacao", { replace: true });
  }, [navigate]);
  return null;
}
