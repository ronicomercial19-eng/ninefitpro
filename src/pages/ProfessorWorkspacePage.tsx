import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { CoachStudentPanel } from "@/components/students/CoachStudentPanel";
export default function ProfessorWorkspacePage() {
  const w = useProfessorWorkspace();
  return w.athleteId ? (
    <CoachStudentPanel key={w.athleteId} athleteId={w.athleteId} />
  ) : (
    <p>Selecione o aluno para acompanhar os registros do aplicativo.</p>
  );
}
