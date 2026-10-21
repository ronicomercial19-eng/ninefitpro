import { Navigate } from "react-router-dom";

/**
 * Mensagens = atendimento com a equipe (9ZAP).
 * Vive dentro do chat único do RON, na aba "Equipe".
 */
export default function NineFitMensagens() {
  return <Navigate to="/9fit/ron?tab=equipe" replace />;
}
