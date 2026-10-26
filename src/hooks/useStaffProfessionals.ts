import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withTimeout } from '@/lib/withTimeout';
export type StaffProfessional = { id:string;name:string;role:string;skills:string[];location:string;availability:string[];photo_url?:string };
export function useStaffProfessionals(method:string) {
  const {user}=useAuth();
  return useQuery({queryKey:['external-staff',user?.id,method],enabled:!!user?.id,retry:1,queryFn:async()=>{
    const {data,error}=await withTimeout(supabase.functions.invoke('staff-api',{body:{action:'professionals',method}}));
    if(error || !data?.ok) throw error || new Error('Equipe Staff indisponível');
    return data.professionals as StaffProfessional[];
  }});
}
