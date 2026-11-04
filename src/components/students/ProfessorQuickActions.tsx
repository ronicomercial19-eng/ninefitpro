import {Link} from 'react-router-dom';
import {useProfessorWorkspace} from '@/contexts/ProfessorWorkspace';
import {Button} from '@/components/ui/button';
export function ProfessorQuickActions(){const w=useProfessorWorkspace();return <nav aria-label="Ações do professor" className="mb-5 flex gap-2 overflow-x-auto pb-1">{[['Ficha','/app/acompanhamento'],['Preparar treino','/app/treino-ia'],['Modelos 9FIT','/app/modelos-ninefit'],['Super Séries','/app/super-series'],['Séries de referência','/app/series-referencia'],['Skills','/app/skills']].map(([label,path])=><Button key={path} size="sm" variant="outline" className="min-h-11 shrink-0" asChild><Link to={w.link(path)}>{label}</Link></Button>)}</nav>;}
