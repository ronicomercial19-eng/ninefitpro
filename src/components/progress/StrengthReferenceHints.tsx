import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {readinessRpc} from '@/services/readiness';
const labels:Record<string,string>={rm1_empurrar_superior:'Empurrar · superior',rm1_empurrar_perna:'Empurrar · pernas',rm1_puxar_costas:'Puxar · costas',rm1_puxar_inferior:'Puxar · inferior'};
type Ref={key:string;kg:number;date:string;source:string;confirmed:boolean;load_hint_kg:number|null};
export function StrengthReferenceHints({athleteId}:{athleteId:string}) {
 const [percent,setPercent]=useState(''),[appliedPercent,setAppliedPercent]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const query=useQuery({queryKey:['strength-reference-hints',athleteId,appliedPercent],staleTime:30_000,queryFn:()=>readinessRpc('fn_get_strength_reference_hints',{p_athlete_id:athleteId,p_percentage:appliedPercent})});
 async function confirm(ref:Ref){if(busy)return;setBusy(true);setError('');try{await readinessRpc('fn_confirm_strength_reference',{p_athlete_id:athleteId,p_reference_key:ref.key,p_kg:ref.kg,p_reference_date:ref.date});await query.refetch();}catch{setError('Não foi possível confirmar essa referência. Atualize suas avaliações e confira o valor.');}finally{setBusy(false);}}
 const refs=(query.data?.references||[]) as Ref[];
 if(query.isPending)return <p className="text-sm text-muted-foreground" role="status">Carregando referências de força...</p>;
 if(query.isError)return <button type="button" onClick={()=>void query.refetch()}>Recarregar referências de força</button>;
 if(!refs.length)return null;
 return <section className="aw-card space-y-3"><h3>Referências de força e carga</h3><p className="aw-note">O cálculo usa um 1RM registrado pelo professor ou confirmado por você. Informe o percentual definido na sua prescrição; esta conta não altera o treino.</p>
 <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Percentual da prescrição<input className="ml-2 w-20 rounded-xl border bg-background p-2" type="number" min="1" max="100" value={percent} onChange={e=>setPercent(e.target.value)}/></label><button type="button" className="rounded-2xl bg-primary px-3 py-2 text-sm text-primary-foreground" disabled={!percent||Number(percent)<1||Number(percent)>100} onClick={()=>setAppliedPercent(Number(percent))}>Calcular referência</button></div>
 {refs.map(ref=><div key={ref.key} className="rounded-2xl border border-primary/25 p-3 space-y-2"><p className="font-medium">{labels[ref.key]||ref.key}: 1RM {ref.kg} kg</p><p className="text-xs text-muted-foreground">{ref.date} · {ref.source==='professor'?'Avaliação com professor':'Registro informado por você'} · {ref.confirmed?'Referência confirmada':'Confirmação pendente'}</p>{ref.confirmed?<p className="text-sm">{ref.load_hint_kg!=null?`${appliedPercent}% da referência: ${ref.load_hint_kg} kg`:'Informe o percentual da sua prescrição para calcular.'}</p>:<button type="button" disabled={busy} className="text-sm text-primary underline" onClick={()=>void confirm(ref)}>Confirmo que esse 1RM registrado está correto</button>}</div>)}
 {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</section>;
}
