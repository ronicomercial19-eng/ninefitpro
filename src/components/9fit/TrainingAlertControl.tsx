import {useEffect,useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {readinessRpc} from '@/services/readiness';
export function TrainingAlertControl({athleteId}:{athleteId:string}){
 const [reported,setReported]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const query=useQuery({queryKey:['training-guard',athleteId],staleTime:15_000,retry:false,queryFn:()=>readinessRpc('fn_get_training_guard',{p_athlete_id:athleteId})});
 useEffect(()=>{setReported(null);setError('');},[athleteId]);
 const checked=reported??!!query.data?.blocked;const blocked=checked||query.data?.blocked;
 async function save(){if(reported===null||busy)return;setBusy(true);setError('');try{await readinessRpc('fn_report_training_alert',{p_athlete_id:athleteId,p_reported:reported});setReported(null);await query.refetch();window.dispatchEvent(new Event('9fit:sync_updated'));}catch{setError('Não foi possível confirmar seu relato. Tente novamente.');}finally{setBusy(false);}}
 return <section className="rounded-2xl border border-border p-3 space-y-2 text-sm"><label className="flex gap-2"><input type="checkbox" checked={checked} disabled={busy} onChange={e=>setReported(e.target.checked)}/>Estou com dor forte no peito, falta de ar intensa ou tive desmaio hoje.</label>
 {blocked&&<div role="alert" className="rounded-xl border border-destructive/40 p-3"><strong>Interrompa o treino e procure atendimento.</strong><p>Em uma emergência, acione o SAMU 192. {query.data?.blocked?'Seu relato está registrado e bloqueia o início ou a retomada de sessões.':'Salve o relato para registrar o bloqueio de novas sessões.'} O app não faz diagnóstico.</p><a className="underline" href="https://linhasdecuidado.saude.gov.br/portal/dor-toracica/sou-paciente/" target="_blank" rel="noreferrer">Orientações do Ministério da Saúde</a></div>}
 {reported!==null&&<button type="button" disabled={busy} className="text-primary underline" onClick={()=>void save()}>{busy?'Salvando...':'Salvar meu relato'}</button>}
 {query.isError&&<button type="button" onClick={()=>void query.refetch()} className="underline">Recarregar meu relato</button>}{error&&<p role="alert">{error}</p>}
 </section>;
}
