import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { PostWorkoutModal } from '@/components/9fit/PostWorkoutModal';
import { StudentSectionHeader } from '@/components/9fit/StudentSectionHeader';
export default function NineFitPostWorkout() {
  const { athleteId, loading: identityLoading } = useAthleteId();
  const [params] = useSearchParams(); const navigate = useNavigate();
  const executionId = params.get('execution_id');
  const [execution, setExecution] = useState<{id:string;phase_name:string|null}|null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true; setExecution(null); setError(false);
    if(!athleteId){setLoading(false);return;}
    setLoading(true);
    let query=supabase.from('workout_executions').select('id,phase_name').eq('athlete_id',athleteId).eq('status','completed');
    if(executionId)query=query.eq('id',executionId);
    void query.order('completed_at',{ascending:false}).limit(1).maybeSingle().then(({data,error})=>{if(active){setExecution(data);setError(!!error);setLoading(false);}});
    return()=>{active=false;};
  },[athleteId,executionId,retry]);
  return <main className="min-h-screen bg-background pb-28"><StudentSectionHeader kicker="9FIT // PÓS-TREINO" title="Seu pós-treino" description="Registre como foi a sessão e ajude o sistema a calibrar seu próximo passo." /><section className="mx-auto max-w-lg space-y-4 px-4 pt-5">
    <div className="rounded-2xl border border-white/10 bg-card/70 p-5">{loading||identityLoading?<p role="status" className="text-sm text-muted-foreground">Localizando a sessão concluída…</p>:error?<div role="alert" className="space-y-3"><p className="text-sm">Não foi possível conferir sua sessão.</p><button className="text-sm text-primary underline" onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></div>:!execution?<p className="text-sm text-muted-foreground">Nenhuma sessão concluída foi encontrada para registrar este feedback.</p>:<PostWorkoutModal open athleteId={athleteId!} executionId={execution.id} trainingName={execution.phase_name||'Treino concluído'} onClose={()=>navigate('/9fit/progresso/historico',{replace:true})}/>}</div>
    <Link className="block text-center text-sm text-primary underline" to="/9fit/train">Voltar aos treinos</Link></section></main>;
}
