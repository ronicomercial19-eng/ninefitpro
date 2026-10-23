import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CHECKOUT_READY, SUPPORT_EMAIL } from '@/config/commercialOffer';
import { trackMonetizationEvent } from '@/services/monetization';
export default function NineFitCheckout() {
  const { offerId } = useParams<{ offerId: string }>();
  const [offer, setOffer] = useState<any>(null);
  const [status, setStatus] = useState<'loading'|'ready'|'missing'|'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true; setOffer(null); setStatus('loading');
    if(!offerId) { setStatus('missing'); return; }
    if(!CHECKOUT_READY) { setStatus('ready'); return; }
    void supabase.from('monetization_offers').select('*').eq('id',offerId).maybeSingle().then(({data,error}) => {
      if(!active) return;
      setOffer(data); setStatus(error ? 'error' : data ? 'ready' : 'missing');
      if(data && !error) trackMonetizationEvent('view_paywall',offerId,'dedicated_screen');
    });
    return () => { active = false; };
  },[offerId,retry]);
  let checkoutUrl: string | null = null;
  try { const url = new URL(offer?.checkout_url); if(url.protocol === 'https:' && !url.username && !url.password) checkoutUrl=url.toString(); } catch { /* Missing configuration. */ }
  return <main className="min-h-screen bg-background p-6"><section className="max-w-lg mx-auto space-y-5"><h1 className="text-2xl font-display">Contratação {offer?.name ? `· ${offer.name}` : ''}</h1>
    {!CHECKOUT_READY ? <><p>Contratação online em configuração. Confirme disponibilidade e condições com a NINE FIT.</p><a className="text-primary underline" href={`mailto:${SUPPORT_EMAIL}`}>Falar com a NINE FIT</a></> : status==='loading' ? <p role="status">Carregando oferta…</p> : status==='error' ? <div role="alert"><p>Não foi possível carregar esta oferta.</p><button onClick={()=>setRetry(n=>n+1)} className="text-primary underline">Tentar novamente</button></div> : status==='missing' ? <p role="alert">Oferta não encontrada.</p> : checkoutUrl ? <a href={checkoutUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-primary p-4 text-center text-primary-foreground">Abrir condições de pagamento</a> : <p>O pagamento desta oferta ainda não está disponível. Consulte a equipe.</p>}
    <Link className="block text-primary underline" to="/9fit/planos">Voltar aos planos</Link></section></main>;
}
