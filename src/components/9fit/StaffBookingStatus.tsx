import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAthleteId } from '@/hooks/useAthleteId';
import { withTimeout } from '@/lib/withTimeout';
import { useQuery } from '@tanstack/react-query';
type Booking={id:string;title:string;scheduled_at:string;staff_professional_id:string|null;staff_booking_id:string|null;staff_status:string|null;credit_charged:boolean;integration_status:string|null};
export function StaffBookingStatus(){
 const {athleteId}=useAthleteId();const [syncFailed,setSyncFailed]=useState(false);const [syncing,setSyncing]=useState(false);
 const query=useQuery({queryKey:['staff-bookings',athleteId],enabled:!!athleteId,queryFn:async():Promise<Booking[]>=>{
  const {data,error}=await withTimeout<any>((supabase as any).from('appointments').select('id,title,scheduled_at,staff_professional_id,staff_booking_id,staff_status,credit_charged,integration_status').eq('student_id',athleteId).not('staff_professional_id','is',null).order('created_at',{ascending:false}).limit(5));
  if(error)throw error;return data||[];
 }});
 const rows=query.data||[],failed=query.isError||syncFailed,loading=query.isLoading||syncing;
 const refresh=async()=>{setSyncFailed(false);await query.refetch();};
 useEffect(()=>{const listener=()=>void query.refetch();window.addEventListener('9fit:appointments-updated',listener);return()=>window.removeEventListener('9fit:appointments-updated',listener);},[query.refetch]);
 async function sync(row:Booking){setSyncing(true);setSyncFailed(false);try{const {data,error}=await withTimeout(supabase.functions.invoke('staff-api',{body:{action:row.staff_booking_id?'status':'booking',appointment_id:row.id}}));if(error||!data?.ok)throw error||new Error('sync_failed');await refresh();}catch{setSyncFailed(true);}finally{setSyncing(false);}}
 return <section className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-4 space-y-3"><h2 className="font-semibold">9FIT Staff · suas reservas</h2>
 {loading&&<p role="status" className="text-xs">Atualizando reservas…</p>}{failed&&<button className="min-h-10 text-xs text-primary" onClick={()=>void refresh()}>Falha ao atualizar · Tentar novamente</button>}
 {!loading&&!rows.length&&<p className="text-xs text-muted-foreground">Nenhuma reserva Staff registrada.</p>}
 {rows.map(row=><article key={row.id} className="rounded-xl border border-primary/20 p-3 space-y-2"><h3 className="text-sm font-medium">{row.title}</h3><p className="text-xs">{new Date(row.scheduled_at).toLocaleString('pt-BR')}</p><ol className="grid grid-cols-3 gap-2 text-xs"><li><b>Staff Sync</b><p>{row.staff_booking_id?'Enviado':'Aguardando envio'}</p></li><li><b>Gateway</b><p>{row.staff_status||'Sem confirmação'}</p></li><li><b>Crédito</b><p>{row.credit_charged?'Consumo registrado':'Sem débito registrado'}</p></li></ol><button disabled={loading} className="min-h-10 text-xs text-primary disabled:opacity-50" onClick={()=>void sync(row)}>{row.staff_booking_id?'Atualizar status':'Reenviar solicitação'}</button></article>)}
 </section>;
}
