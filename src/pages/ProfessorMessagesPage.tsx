import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { ProfessionalMessages } from "@/components/students/ProfessionalMessages";
export default function ProfessorMessagesPage() {
  const w = useProfessorWorkspace();
  return w.selected ? (
    <ProfessionalMessages
      key={w.selected.id}
      athleteId={w.selected.id}
      name={w.selected.name}
      professional
    />
  ) : (
    <p>Selecione um aluno para abrir a conversa.</p>
  );
}
