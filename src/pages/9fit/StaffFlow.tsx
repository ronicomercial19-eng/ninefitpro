import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Loader2, Users } from 'lucide-react';
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
    <header className="relative flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-primary/15 bg-[radial-gradient(ellipse_at_top,#29180f_0%,#101112_75%)] px-3 py-2 shadow-[0_8px_30px_-18px_rgba(255,90,31,0.35)] sm:px-5">
      <button type="button" onClick={() => goBackOrHome(navigate)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-3 text-xs hover:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Voltar ao FitPro"><ArrowLeft size={16} aria-hidden="true"/>Voltar</button>
      <span className="flex items-center gap-2.5"><span aria-hidden="true" className="grid size-8 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary"><Users size={16}/></span><span><span className="block text-xs font-bold tracking-[0.12em]">9FIT <span className="text-primary">STAFF</span></span><span className="mt-0.5 hidden text-[9px] uppercase tracking-widest text-white/40 sm:block">Interface oficial</span></span></span>
      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs text-white/70 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" aria-label="Abrir Staff oficial em nova aba"><span className="hidden sm:inline">Abrir em nova aba</span><ExternalLink size={17} aria-hidden="true"/></a>}
    </header>
    {url ? <div className="relative min-h-0 flex-1">
      {!loaded && <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center bg-[#070707]"><span className="mx-5 max-w-sm rounded-3xl border border-primary/15 bg-[radial-gradient(ellipse_at_top,#2c1c13_0%,#111315_70%)] px-8 py-10 text-center shadow-2xl shadow-black/50"><span className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-primary/25 bg-primary/10 text-primary"><Users size={28} aria-hidden="true" /></span><span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.25em] text-primary">9FIT / STAFF</span><span className="block text-xl font-semibold">Conectando ao Staff</span><span className="mt-3 flex items-center justify-center gap-2 text-xs text-white/50"><Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true"/>Abrindo a interface oficial Staff…</span></span></div>}
      <iframe src={url} title="9FIT Staff · fluxo oficial" className="h-full w-full border-0" allow={provider?.allow ?? 'clipboard-write; geolocation; fullscreen'} allowFullScreen onLoad={() => setLoaded(true)}/>
    </div> : <div role="alert" className="grid flex-1 place-items-center p-6 text-center text-sm">Não foi possível localizar a interface oficial Staff. Volte ao FitPro e tente novamente.</div>}
  </main>;
}
