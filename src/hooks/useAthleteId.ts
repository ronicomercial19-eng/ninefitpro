import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UseAthleteIdResult { athleteId:string|null; athleteName:string|null; loading:boolean; error:string|null; }
export function useAthleteId(): UseAthleteIdResult {
  const {user,loading:authLoading}=useAuth();
  const [state,setState]=useState<UseAthleteIdResult>({athleteId:null,athleteName:null,loading:true,error:null});
  const [revision,setRevision]=useState(0);
  useEffect(()=>{ const refresh=()=>setRevision(n=>n+1); window.addEventListener('9fit:profile-updated',refresh); return ()=>window.removeEventListener('9fit:profile-updated',refresh); },[]);
  useEffect(()=>{
    let active=true;
    setState({athleteId:null,athleteName:null,loading:!!user,error:null});
    if(!user) return;
    void (async()=>{
      try {
        const {data:id,error}=await supabase.rpc('fn_current_athlete_id');
        if(error) throw error;
        if(!id) throw new Error('Perfil de atleta não encontrado');
        const {data:athlete,error:profileError}=await supabase.from('athletes').select('id,name').eq('id',id).single();
        if(profileError) throw profileError;
        if(active) setState({athleteId:athlete.id,athleteName:athlete.name,loading:false,error:null});
      } catch(error) { if(active) setState({athleteId:null,athleteName:null,loading:false,error:error instanceof Error ? error.message : 'Erro ao carregar perfil'}); }
    })();
    return ()=>{active=false;};
  },[user?.id,revision]);
  return {...state, loading:authLoading || state.loading};
}
