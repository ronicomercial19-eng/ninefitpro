import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {useProfessorWorkspace} from '@/contexts/ProfessorWorkspace';
import {Button} from '@/components/ui/button';
const names=['Agachamento goblet','Remada baixa','Supino com halteres','Ponte de glúteos','Prancha frontal'];
export function ExerciseExamples(){const w=useProfessorWorkspace();const q=useQuery({queryKey:['exercise-examples'],queryFn:async()=>{const {data,error}=await supabase.from('exercises').select('id,name').in('name',names).order('name');if(error)throw error;return data;}});return <section className="rounded-xl border bg-card p-4 space-y-3"><h2 className="font-semibold">5 exercícios de referência para começar</h2><p className="text-xs text-muted-foreground">Abra um exercício no rascunho do aluno e revise a dose antes de publicar.</p>{q.isError?<p>Não foi possível carregar os exemplos.</p>:<div className="flex flex-wrap gap-2">{q.data?.map(e=><Button key={e.id} variant="outline" asChild><Link to={w.link(`/app/treino-ia?exercise=${e.id}`)}>{e.name}</Link></Button>)}</div>}</section>;}
