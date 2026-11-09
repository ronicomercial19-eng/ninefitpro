import { CoreRequests } from "@/components/students/CoreRequests";
import { CareWorkspace } from "@/components/students/CareWorkspace";
import { useProfessorWorkspace } from "@/contexts/ProfessorWorkspace";
import {SelectedStudentFile} from '@/components/students/SelectedStudentFile';
import { PendingAccessPanel } from '@/components/students/PendingAccessPanel';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ProfessorWorkspacePage() {
  const w = useProfessorWorkspace();
  const [params] = useSearchParams();
  const [accessOpen, setAccessOpen] = useState(params.get('access') === '1');
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="nine-core-kicker">Acompanhamento</p>
          <h1 className="nine-core-title">{w.selected?.name ?? "Carteira de alunos"}</h1>
        </div>
        <Button variant="outline" className="min-h-11 gap-2" aria-expanded={accessOpen} aria-controls="professor-access-panel" onClick={() => setAccessOpen((open) => !open)}>
          <UserPlus className="h-5 w-5" /> Liberar acesso
        </Button>
      </div>
      {accessOpen && <div id="professor-access-panel"><PendingAccessPanel /></div>}
      {w.athleteId ? (
        <SelectedStudentFile key={w.athleteId} athleteId={w.athleteId} />
      ) : (
        <p>Selecione o aluno para acompanhar os registros do aplicativo.</p>
      )}
      <CoreRequests athleteId={w.athleteId} />
      <CareWorkspace professional athleteId={w.athleteId} />
    </div>
  );
}

