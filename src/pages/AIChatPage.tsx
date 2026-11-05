import { AITrainingWorkspace } from "./AITrainingPage";
export default function AIChatPage() {
  return <section className="space-y-4">
    <header><p className="nine-core-kicker">Treinamento</p><h1 className="nine-core-title">Prescrever treino</h1><p className="text-sm text-muted-foreground">Monte a sessão, revise os parâmetros e publique no app do aluno.</p></header>
    <AITrainingWorkspace />
  </section>;
}
