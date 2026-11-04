import {useRef,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {supabase} from '@/integrations/supabase/client';
import {useAuth} from '@/contexts/AuthContext';
import {useProfessorWorkspace} from '@/contexts/ProfessorWorkspace';
import {professorAI} from '@/services/professorAI';
import {skillRoute,type RuntimeSkill} from '../../../supabase/functions/_shared/professionalSkills';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import ReactMarkdown from 'react-markdown';
export function ProfessorSkills(){
 const w=useProfessorWorkspace(),{user}=useAuth();
 const [running,setRunning]=useState<string|null>(null),[answer,setAnswer]=useState<{athleteId:string;name:string;content:string;applied:string[]}|null>(null);
 const run=useRef(false);
 const query=useQuery({queryKey:['professor-active-skills',user?.id,w.athleteId],enabled:!!w.athleteId,queryFn:async()=>{const {data,error}=await supabase.rpc('fn_professor_active_skills' as any,{p_athlete_id:w.athleteId});if(error)throw error;return data as unknown as RuntimeSkill[];}});
 async function execute(skill:RuntimeSkill){
  if(!w.selected||run.current)return;run.current=true;setRunning(skill.id);const target=w.selected;
  try{const result=await professorAI(target.id,'analyze_progress',`Aplique a skill ${skill.name} aos registros deste aluno. Cite fontes, dados faltantes e próximos passos concretos para revisão.`,[],skill.id);
   if(!result.skills_applied?.some(row=>row.id===skill.id))throw new Error('A execução da skill não foi confirmada.');
   setAnswer({athleteId:target.id,name:skill.name,content:result.content,applied:result.skills_applied.map(row=>`${row.slug} v${row.version}`)});
  }catch(e){toast.error((e as Error).message||'Falha ao executar a skill.');}finally{run.current=false;setRunning(null);}
 }
 return <section className="space-y-4"><h1 className="text-2xl font-semibold">Skills do professor</h1><p className="text-sm text-muted-foreground">Escolha o aluno e execute uma skill. O resultado identifica a versão aplicada e usa a ficha PDI, os registros e as restrições desse aluno.</p>
 <div className="flex flex-wrap gap-2"><Button asChild><Link to={w.link('/app/treino-ia')}>Preparar treino</Link></Button><Button asChild variant="outline"><Link to={w.link('/app/analise-ia')}>Analisar aluno</Link></Button><Button variant="outline" disabled={!w.athleteId||query.isFetching} onClick={()=>void query.refetch()}>Atualizar skills</Button></div>
 {!w.selected?<p>Selecione um aluno no topo para carregar suas skills disponíveis.</p>:query.isPending?<p role="status">Carregando skills de {w.selected.name}…</p>:query.isError?<p role="alert">Não foi possível confirmar as skills ativas. Tente atualizar.</p>:<div className="grid gap-3 md:grid-cols-2">{query.data?.map(skill=><article key={skill.id} className="rounded-xl border bg-card p-4 space-y-3"><h2 className="font-semibold">{skill.name}</h2><p className="text-xs text-muted-foreground">{skill.category} · v{skill.version} · {w.selected?.name}</p><p className="text-sm">{skill.description}</p>{skillRoute(skill)?<Button asChild><Link to={w.link(skillRoute(skill)!)}>Abrir {skill.slug==='posturapro'?'análise de técnica':'módulo da skill'}</Link></Button>:<Button disabled={!!running} onClick={()=>void execute(skill)}>{running===skill.id?'Executando…':'Executar para este aluno'}</Button>}</article>)}{!query.data?.length&&<p>Nenhuma skill ativa para este aluno. O administrador pode publicar uma skill na biblioteca abaixo.</p>}</div>}
 {answer?.athleteId===w.athleteId&&<article className="rounded-xl border bg-card p-5 space-y-3" aria-label="Resultado da skill"><h2 className="font-semibold">{answer.name} · {w.selected?.name}</h2><p className="text-xs text-primary">Executada: {answer.applied.join(', ')}</p><ReactMarkdown>{answer.content}</ReactMarkdown><Button asChild><Link to={w.link('/app/treino-ia')} state={{skillAnalysis:answer.content,athleteId:answer.athleteId}}>Preparar treino com esta análise</Link></Button></article>}
 </section>;
}
