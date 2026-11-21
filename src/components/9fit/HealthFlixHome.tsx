import { useState } from 'react';
import { Film, Play } from 'lucide-react';
import type { HealthHome } from '@/lib/healthFlixHome';
import type { HealthVideo } from '@/lib/healthFlixCatalog';
type CoverItem = { title: string; cover_hd_url?: string; cover_16x9_url?: string; cover_url?: string; thumbnail?: string | null };
export function HealthCover({ item, eager = false }: { item: CoverItem; eager?: boolean }) {
  const sources = [...new Set([item.cover_hd_url, item.cover_16x9_url, item.cover_url, item.thumbnail].filter(Boolean))] as string[];
  const [failed, setFailed] = useState<string[]>([]);
  const source = sources.find(url => !failed.includes(url));
  return source ? <img src={source} alt="" loading={eager ? 'eager' : 'lazy'} className="h-full w-full object-cover" onError={() => setFailed(current => [...current, source])}/> : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/25 to-muted"><Film aria-hidden="true" size={36}/></div>;
}
function Progress({ value }: { value: unknown }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));
  return progress > 0 ? <div className="h-1 w-full overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Progresso do treino" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full bg-primary" style={{width: `${progress}%`}}/></div> : null;
}
export function HealthFlixHome({ home, onOpen }: { home: HealthHome; onOpen: (item: HealthVideo) => void }) {
  const hero = home.hero;
  return <div className="mb-8 space-y-7">
    {hero && <section className="relative mx-4 isolate min-h-80 overflow-hidden rounded-3xl border border-white/10 bg-muted sm:min-h-96" aria-label={hero.label}>
      <div className="absolute inset-0 -z-20"><HealthCover item={hero.item} eager/></div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/65 to-black/10"/>
      <div className="max-w-xl p-6 sm:p-10">
        <p className="text-[10px] font-bold uppercase tracking-[.2em] text-orange-300">{hero.label}</p>
        <h2 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-5xl">{hero.item.title}</h2>
        <p className="mt-4 text-xs text-white/80">{[hero.item.duration_label || hero.item.duration, hero.item.modality || hero.item.category, hero.item.level_key || hero.item.level].filter(Boolean).join(' · ')}</p>
        {Number(hero.item.match_percent)>0 && <p className="mt-2 text-xs text-orange-200">{Math.min(100,Math.round(Number(hero.item.match_percent)))}% de afinidade com seu perfil</p>}
        <button type="button" onClick={() => onOpen(hero.item)} className="mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"><Play size={18} fill="currentColor" aria-hidden="true"/>{hero.cta}</button>
        <div className="mt-5 max-w-xs"><Progress value={hero.item.progress_percent}/></div>
      </div>
    </section>}
    {home.rows.map(row => <section key={row.key} aria-label={row.title}>
      <h2 className="mb-3 px-4 text-lg font-bold tracking-tight">{row.title}</h2>
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4">
        {row.items.map(item => <button type="button" key={item.external_id || item.id} onClick={() => onOpen(item)} className="group w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-card text-left transition hover:border-primary/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          <div className="relative aspect-video overflow-hidden"><HealthCover item={item}/><span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-[10px] text-white">{item.duration_label || item.duration}</span></div>
          <Progress value={item.progress_percent}/>
          <div className="p-3"><p className="line-clamp-2 text-sm font-semibold">{item.title}</p><p className="mt-2 text-[10px] text-muted-foreground">{[item.modality || item.category,item.level_key || item.level].filter(Boolean).join(' · ')}</p>{Number(item.progress_percent)>0&&<p className="mt-2 text-[10px] text-primary">{Number(item.progress_percent)>=100?'Concluído':`${Math.round(Number(item.progress_percent))}% assistido`}</p>}</div>
        </button>)}
      </div>
    </section>)}
  </div>;
}
