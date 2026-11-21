import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getEmbeddedApp } from '@/data/ecosystemApps';
import { safeExternalAppUrl } from '@/lib/externalApps';
import { goBackOrHome } from '@/lib/ninefitNavigation';

/** Staff owns every step, card and action inside this container. */
export default function NineFitStaffFlow() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const provider = getEmbeddedApp('staff');
  const url = provider ? safeExternalAppUrl(provider.url) : null;
  return <main className="fixed inset-0 z-[90] flex h-[100dvh] min-h-0 flex-col bg-[#070707] text-white" data-testid="staff-provider-flow">
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-3 py-2">
      <button type="button" onClick={() => goBackOrHome(navigate)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Voltar ao FitPro"><ArrowLeft size={16} aria-hidden="true"/>Voltar</button>
      <span className="text-xs font-semibold tracking-wide">9FIT <span className="text-primary">STAFF</span></span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs text-white/70 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Abrir Staff oficial em nova aba"><span className="hidden sm:inline">Abrir em nova aba</span><ExternalLink size={17} aria-hidden="true"/></a>}
    </header>
    {url ? <div className="relative min-h-0 flex-1">
      {!loaded && <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center bg-[#070707]"><span className="flex items-center gap-3 text-sm text-white/70"><Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true"/>Abrindo a interface oficial Staff…</span></div>}
      <iframe src={url} title="9FIT Staff · fluxo oficial" className="h-full w-full border-0" allow={provider?.allow ?? 'clipboard-write; geolocation; fullscreen'} allowFullScreen onLoad={() => setLoaded(true)}/>
    </div> : <div role="alert" className="grid flex-1 place-items-center p-6 text-center text-sm">Não foi possível localizar a interface oficial Staff. Volte ao FitPro e tente novamente.</div>}
  </main>;
}
