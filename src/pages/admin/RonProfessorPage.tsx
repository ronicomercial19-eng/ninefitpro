import { useState } from "react";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { Button } from "@/components/ui/button";
import { ProfessorConversation } from "@/components/students/ProfessorConversation";
import { ProfessorPrescription } from "@/components/students/ProfessorPrescription";
import { ProfessionalMessages } from "@/components/students/ProfessionalMessages";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import AgendaPage from "../AgendaPage";

export default function RonProfessorPage() {
  const { selected } = useProfessorWorkspace();
  const [action, setAction] = useState<"agenda" | "message" | "publish" | null>(null);
  return <section className="min-w-0 space-y-4">
    <header><h1 className="text-2xl font-bold">RON</h1><p className="text-sm text-muted-foreground">Consulte o contexto e execute ações para {selected?.name ?? "o aluno selecionado"}.</p></header>
    {selected && <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => setAction("agenda")}>Agendar aula</Button>
      <Button variant="outline" onClick={() => setAction("message")}>Enviar mensagem</Button>
      <Button variant="outline" onClick={() => setAction("publish")}>Revisar publicação</Button>
    </div>}
    <ProfessorConversation />
    <Dialog open={!!action} onOpenChange={open => { if (!open) setAction(null); }}>
      <DialogContent className="max-h-[85dvh] max-w-4xl overflow-y-auto">
        <DialogTitle>{action === "agenda" ? "Agendar aula" : action === "message" ? "Mensagem ao aluno" : "Revisar publicação"} · {selected?.name}</DialogTitle>
        {action === "agenda" ? <AgendaPage /> : action === "message" && selected
          ? <ProfessionalMessages athleteId={selected.id} name={selected.name} professional />
          : action === "publish" && <ProfessorPrescription embedded />}
      </DialogContent>
    </Dialog>
  </section>;
}
