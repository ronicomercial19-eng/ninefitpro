import { AITrainingWorkspace } from "./AITrainingPage";
export default function AIChatPage() {
  return <section className="space-y-4">
    <header><h1 className="text-2xl font-bold">Assistente IA</h1><p className="text-sm text-muted-foreground">Prepare um rascunho e revise as doses antes de entregar ao aluno.</p></header>
    <AITrainingWorkspace />
  </section>;
}
