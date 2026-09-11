import { Navigate } from "react-router-dom";

/**
 * Canal único de conversa do aluno: o RON.
 * A antiga tela de mensagens duplicava o chat e o histórico do copiloto.
 */
export default function NineFitMensagens() {
  return <Navigate to="/9fit/ron" replace />;
}
