import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {Link} from 'react-router-dom';
import {useAuth} from '@/contexts/AuthContext';
import {readinessRpc} from '@/services/readiness';
import {withAthlete} from '@/lib/professorWorkspace';
import {businessDate} from '@/services/dailyContextRules';
type Alert={id:string;athlete_id:string;name:string;gate_level:number;flags:string[];status:string};
export function CoachReadinessInbox(){
 const {user,isTrainer}=useAuth();const [page,setPage]=useState(0);
 const q=useQuery({queryKey:['coach-readiness-alerts',user?.id,businessDate(),page],enabled:!!user&&isTrainer,staleTime:30_000,refetchInterval:60_000,refetchIntervalInBackground:false,queryFn:async()=>await readinessRpc('fn_coach_readiness_alerts',{p_limit:25,p_offset:page*25}) as {items:Alert[];total:number}});
 if(!isTrainer)return null;
 return <section className="my-5 rounded-3xl border border-primary/25 bg-card p-5 space-y-3"><div className="flex justify-between gap-3"><h2 className="font-semibold">Revisões da Sync de hoje</h2><button className="text-sm text-primary underline" type="button" onClick={()=>void q.refetch()}>Atualizar</button></div>
 {q.isPending?<p role="status">Carregando prioridades...</p>:q.isError?<p role="alert">Não foi possível consultar as revisões. Tente atualizar.</p>:<><p className="text-sm text-muted-foreground">{q.data?.total||0} aluno(s) com sinais ou prescrição para revisar. Atualização automática a cada minuto enquanto esta tela estiver aberta.</p>
 {q.data?.items.map(row=><Link key={row.id} to={withAthlete('/app/acompanhamento',row.athlete_id)} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border p-3"><span className="font-medium">{row.name}</span><span className="text-sm text-muted-foreground">{row.flags.includes('training_alert_reported')?'Sinal de alerta relatado pelo aluno':row.flags.includes('persistent_pain_review')?'Dor alta persistente':row.gate_level>0?'Desconforto informado':row.status==='skipped_changed'?'Prescrição alterada':'Tendência de recuperação baixa'} · abrir acompanhamento</span></Link>)}
 {(q.data?.total||0)>25&&<div className="flex items-center gap-3 text-sm"><button disabled={page===0} className="underline disabled:opacity-40" onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1}</span><button disabled={(page+1)*25>=(q.data?.total||0)} className="underline disabled:opacity-40" onClick={()=>setPage(p=>p+1)}>Próxima</button></div>}</>}
 </section>;
}
