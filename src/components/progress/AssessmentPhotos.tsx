import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AssessmentRow } from '@/services/assessmentHubService';
import { extra } from '@/services/assessmentMetrics';

export function assessmentPhotoPaths(row: AssessmentRow): string[] {
  const photos=extra(row).fotos;
  return Array.isArray(photos) ? [...new Set(photos.filter((p):p is string=>typeof p==='string' && p.startsWith(`${row.athlete_id}/`) && !p.includes('..') && p.length<300))] : [];
}
export function AssessmentPhotos({ row }: { row:AssessmentRow }) {
  const paths=assessmentPhotoPaths(row),key=JSON.stringify(paths);
  const [images,setImages]=useState<{path:string;url:string}[]>([]),[error,setError]=useState(false),[loading,setLoading]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{
    let active=true;
    setImages([]);setError(false);
    if(!paths.length)return;
    setLoading(true);
    void supabase.storage.from('student-photos').createSignedUrls(paths,300).then(({data,error})=>{
      if(!active)return;
      const valid=(data??[]).filter(item=>item.signedUrl&&!item.error).map(item=>({path:item.path??'',url:item.signedUrl}));
      setImages(valid);setError(!!error||valid.length!==paths.length);setLoading(false);
    }).catch(()=>{if(active){setError(true);setLoading(false)}});
    return()=>{active=false};
    // URLs are never persisted or sent to another service.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[row.id,key,revision]);
  if(!paths.length)return null;
  return <section className="aw-card"><h3>Fotos desta avaliação</h3><p className="aw-note">Acesso privado e temporário. Atualize para renovar os links após cinco minutos.</p>{loading&&<p role="status">Carregando fotos autorizadas…</p>}{error&&<p role="alert">Uma ou mais fotos não puderam ser abertas. O registro da avaliação permanece disponível.</p>}<div className="grid grid-cols-2 gap-3">{images.map((image,index)=><a key={image.path} href={image.url} target="_blank" rel="noopener noreferrer"><img src={image.url} alt={`Foto da avaliação ${index+1}`} className="w-full rounded-xl" onError={()=>setError(true)}/></a>)}</div><button type="button" className="aw-secondary aw-no-print" disabled={loading} onClick={()=>setRevision(r=>r+1)}>Atualizar fotos</button></section>;
}
