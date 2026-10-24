import { CareWorkspace } from "@/components/students/CareWorkspace";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import { CoachStudentPanel } from "@/components/students/CoachStudentPanel";
export default function ProfessorWorkspacePage() {
  const w = useProfessorWorkspace();
  return (
    <div className="space-y-6">
      <CareWorkspace professional athleteId={w.athleteId} />
      {w.athleteId ? (
        <CoachStudentPanel key={w.athleteId} athleteId={w.athleteId} />
      ) : (
        <p>Selecione o aluno para acompanhar os registros do aplicativo.</p>
      )}
    </div>
  );
}
