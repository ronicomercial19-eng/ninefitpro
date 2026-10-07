import { useEffect, useState } from 'react';
import { addMonths,format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAthleteId } from '@/hooks/useAthleteId';
import { usePhysicalCommitments, type PhysicalCommitment } from '@/hooks/usePhysicalCommitments';
import { getAccessToken,googleSignIn } from '@/services/googleAuth';
import { syncConfirmedCommitment,removeCalendarCommitment } from '@/services/googleCalendar';
import { supabase } from '@/integrations/supabase/client';
import { QuickCheckIn } from './QuickCheckIn';
import { toast } from 'sonner';

export function UpcomingCommitments(){
  const {athleteId}=useAthleteId();const navigate=useNavigate();const [month,setMonth]=useState(new Date()),[syncing,setSyncing]=useState<string|null>(null);
  const [nextContent,setNextContent]=useState<{id:string;title:string;category?:string|null;thumbnail?:string|null}|null>(null);
  const data=usePhysicalCommitments(athleteId,month);
  useEffect(()=>{let active=true;void supabase.functions.invoke('healthflix-proxy?action=content',{method:'GET' as any}).then(({data:catalog,error})=>{if(error||!active)return;const items=(catalog as any)?.items||[];const item=items.find((entry:any)=>entry.video_url);if(item)setNextContent({id:String(item.external_id||item.id),title:String(item.title||'Aula HealthFlix'),category:item.category,thumbnail:item.thumbnail||null});});return()=>{active=false;};},[]);
  async function sync(item:PhysicalCommitment){
    if(!athleteId||!item.appointmentId||syncing)return;setSyncing(item.id);
    try{
      const token=getAccessToken() || (await googleSignIn()).accessToken;
      const {data:current,error:readError}=await supabase.from('appointments').select('status,scheduled_at,duration,title,location').eq('id',item.appointmentId).eq('student_id',athleteId).single();
      if(readError||!['scheduled','confirmed'].includes(current?.status??''))throw new Error('Confira a confirmação da reserva antes de sincronizar.');
      const event=await syncConfirmedCommitment(token,item.appointmentId,{summary:current.title||item.title,startDateTime:current.scheduled_at,endDateTime:new Date(new Date(current.scheduled_at).getTime()+(current.duration??60)*60000).toISOString(),location:current.location||undefined});
      const {error}=await supabase.from('appointments').update({google_calendar_status:'synced',google_calendar_event_id:event.id}).eq('id',item.appointmentId).eq('student_id',athleteId).eq('scheduled_at',current.scheduled_at).in('status',['scheduled','confirmed']).select('id').single();
      if(error){
        const {data:latest}=await supabase.from('appointments').select('status').eq('id',item.appointmentId).eq('student_id',athleteId).maybeSingle();
        if(latest?.status==='cancelled')await removeCalendarCommitment(token,event.id);
        throw new Error('A reserva mudou ou o status não pôde ser salvo. Confira a agenda e tente novamente sem duplicar.');
      }
      toast.success('Compromisso sincronizado com Google Agenda');window.dispatchEvent(new Event('9fit:appointments-updated'));
    }catch(e){await supabase.from('appointments').update({google_calendar_status:'failed'}).eq('id',item.appointmentId).eq('student_id',athleteId);toast.error(e instanceof Error?e.message:'A sincronização falhou. A reserva continua salva.');window.dispatchEvent(new Event('9fit:appointments-updated'));}finally{setSyncing(null);}
  }
  const style='rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary';
  return <section className="space-y-4" aria-label="Próximos compromissos">
    <div className="flex items-center justify-between gap-2"><button aria-label="Mês anterior" className={style} onClick={()=>setMonth(d=>addMonths(d,-1))}>‹</button><h3 className="text-sm font-semibold capitalize">{format(month,'MMMM yyyy',{locale:ptBR})}</h3><button aria-label="Próximo mês" className={style} onClick={()=>setMonth(d=>addMonths(d,1))}>›</button></div>
    {data.loading?<p className="text-sm">Carregando agenda e saldo…</p>:data.failed?<div role="alert"><p className="text-sm">Não foi possível atualizar seus compromissos.</p><button className={style} onClick={()=>void data.refresh()}>Tentar novamente</button></div>:<>
      <p className="text-xs text-muted-foreground">{data.items.length} compromissos futuros neste mês · {data.balance} créditos de aulas disponíveis</p>
      {data.items.length===0&&<p className="text-sm">Nenhum compromisso futuro neste mês.</p>}
      {data.items.length===0&&nextContent&&<article className="overflow-hidden rounded-xl border border-primary/25 bg-primary/[0.06]">
        {nextContent.thumbnail&&<img src={nextContent.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover"/>}
        <div className="space-y-2 p-3"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Aula disponível agora · HealthFlix</p><h4 className="text-sm font-semibold">{nextContent.title}</h4>{nextContent.category&&<p className="text-xs text-muted-foreground">{nextContent.category} · conteúdo sob demanda</p>}<button className={style} onClick={()=>navigate(`/9fit/healthflix?content=${encodeURIComponent(nextContent.id)}`)}>Assistir e retomar progresso</button></div>
      </article>}
      {data.items.map(item=><article key={item.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-xs text-primary">{item.type} · {item.status==='pending'?'Aguardando confirmação':item.status==='confirmed'?'Confirmado':item.status==='planned'?'Programado':'Agendado'}</p><h4 className="text-sm font-semibold">{item.title}</h4><p className="text-xs text-muted-foreground">{format(new Date(item.at),item.duration===0?'dd/MM/yyyy':"dd/MM/yyyy 'às' HH:mm")}{item.location&&` · ${item.location}`}</p><div className="flex flex-wrap gap-2"><button className={style} onClick={()=>navigate(item.route)}>Ver detalhes</button>{item.appointmentId&&item.status!=='pending'&&<button disabled={!!syncing} className={style} onClick={()=>void sync(item)}>{syncing===item.id?'Sincronizando…':item.calendarStatus==='synced'?'Atualizar Google Agenda':item.calendarStatus==='failed'?'Tentar sincronização novamente':'Sincronizar Google Agenda'}</button>}</div></article>)}
      {data.balance!==null&&data.balance>0?<div className="space-y-2"><p className="text-sm">Você ainda pode agendar com seus créditos. Após cada reserva, escolha outro horário até usar o saldo.</p><button className={style} onClick={()=>navigate('/9fit/aulas-creditos?tab=schedule')}>Agendar com meus créditos</button></div>:<div className="space-y-2"><p className="text-sm">Sem créditos disponíveis para novas aulas. Consulte opções de compra de créditos, aulas e avaliações.</p><button className={style} onClick={()=>navigate('/9fit/aulas-creditos?tab=credits')}>Ver opções de créditos e serviços</button></div>}
    </>}
    <QuickCheckIn />
    <button className={style} onClick={()=>navigate('/9fit/avaliacao-guiada')}>Abrir avaliação guiada</button>
  </section>;
}
