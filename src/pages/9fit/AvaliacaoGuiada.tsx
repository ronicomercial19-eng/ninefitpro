import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Stub — AvaliacaoGuiada legada foi absorvida pelo fluxo único /9fit/ativacao.
 */
export default function NineFitAvaliacaoGuiada() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/9fit/ativacao", { replace: true });
  }, [navigate]);
  return null;
}
