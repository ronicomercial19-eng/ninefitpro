import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { PostWorkoutModal } from '@/components/9fit/PostWorkoutModal';
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
  return <main className="min-h-screen bg-background p-6"><section className="max-w-lg mx-auto space-y-4"><h1 className="text-2xl font-display">Seu pós-treino</h1>
    {loading||identityLoading?<p role="status">Localizando a sessão concluída…</p>:error?<div role="alert"><p>Não foi possível conferir sua sessão.</p><button onClick={()=>setRetry(n=>n+1)}>Tentar novamente</button></div>:!execution?<p>Nenhuma sessão concluída foi encontrada para registrar este feedback.</p>:<PostWorkoutModal open athleteId={athleteId!} executionId={execution.id} trainingName={execution.phase_name||'Treino concluído'} onClose={()=>navigate('/9fit/progresso/historico',{replace:true})}/>}
    <Link className="block text-primary" to="/9fit/train">Voltar aos treinos</Link></section></main>;
}
