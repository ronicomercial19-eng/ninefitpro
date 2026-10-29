import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { withAthlete } from "@/lib/professorWorkspace";
type Item={id:string;name:string;has_periodization:boolean;has_manual_assignment:boolean;latest_workout:string|null};
export function TrainingSetupInbox(){
 const {user}=useAuth();const [page,setPage]=useState(0);
 const q=useQuery({queryKey:["training-setup",user?.id,page],enabled:!!user,staleTime:30_000,retry:false,
  queryFn:async({signal})=>{
   const {data,error}=await (supabase as any).rpc("fn_coach_training_setup_queue",{p_limit:20,p_offset:page*20}).abortSignal(signal);
   if(error)throw error;return data as {total:number;items:Item[]};
  }});
 if(q.isPending)return <p role="status">Consultando a ativação da automação de treino…</p>;
 if(q.isError)return <div role="alert" className="rounded-3xl border border-border p-4">Não foi possível consultar as pendências. <button className="text-primary underline" onClick={()=>void q.refetch()}>Tentar novamente</button></div>;
 if(!q.data.total)return null;
 return <section className="rounded-3xl border border-primary/30 bg-card p-5 space-y-3">
  <div className="flex justify-between gap-3"><h2 className="font-semibold">Automação de treino pendente · {q.data.total}</h2><button className="text-sm text-primary underline" onClick={()=>void q.refetch()}>Atualizar</button></div>
  <p className="text-sm text-muted-foreground">Estes alunos não têm regra automática ativa. A atribuição manual pode continuar disponível; confira o planejamento antes de ativar a automação.</p>
  {q.data.items.map(a=><Link key={a.id} to={withAthlete("/app/acompanhamento",a.id)} className="block rounded-2xl border border-border p-3 text-sm">
   <span className="font-medium">{a.name}</span><span className="block text-muted-foreground">{a.has_manual_assignment?"Com atribuição manual vigente":"Sem atribuição manual vigente"} · {a.has_periodization?"Com periodização ativa":"Sem periodização ativa"}</span>
  </Link>)}
  <div className="flex justify-between items-center text-sm"><button className="text-primary disabled:opacity-40" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(q.data.total/20))}</span><button className="text-primary disabled:opacity-40" disabled={(page+1)*20>=q.data.total} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
 </section>;
}
