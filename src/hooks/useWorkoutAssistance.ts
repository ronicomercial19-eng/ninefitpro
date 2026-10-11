import { useEffect, useState, useRef } from 'react';
import { useDailyContext } from '@/hooks/useDailyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
export const ASSISTANCE_LEVELS = [
  {label:'Solo',desc:'Execução autônoma; RON disponível sob demanda'},
  {label:'Guiado',desc:'Séries, descanso e cadência prescrita'},
  {label:'Assistido',desc:'Orientação contextual do RON e revisão de dificuldades'},
];
export function useWorkoutAssistance(athleteId:string|null){
  const [level,setLevel]=useState(1);
  const context = useDailyContext();
  const { user } = useAuth();
  const queue = useRef<Promise<void>>(Promise.resolve());
  useEffect(()=>{const read=()=>{try{const value=localStorage.getItem(`9fit:assistance:${athleteId}`);const saved=context.data?.profile.preferences.assistance;const modes=['autonomous','guided','technical'];setLevel(saved && modes.includes(saved) ? modes.indexOf(saved) : value!==null&&['0','1','2'].includes(value)?Number(value):1);}catch{setLevel(1);}};read();const changed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.athleteId===athleteId&&[0,1,2].includes(detail.level))setLevel(detail.level);else if(!detail)read();};window.addEventListener('9fit:assistance-updated',changed);return()=>window.removeEventListener('9fit:assistance-updated',changed);},[athleteId,context.data?.profile.preferences.assistance]);
  const change=(value:number)=>{if(![0,1,2].includes(value))return;setLevel(value);try{if(athleteId)localStorage.setItem(`9fit:assistance:${athleteId}`,String(value));}catch{/* A sessão continua sem armazenamento local. */}window.dispatchEvent(new CustomEvent('9fit:assistance-updated',{detail:{athleteId,level:value}}));
    const expectedUserId = user?.id;
    if (athleteId && expectedUserId) queue.current = queue.current.catch(() => {}).then(async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user?.id !== expectedUserId) return;
      const { error } = await supabase.rpc('fn_save_pdi' as any, { p_patch: {}, p_preferences: { assistance: ['autonomous','guided','technical'][value] } });
      if (error) { toast.error('Modo aplicado neste dispositivo. Não consegui sincronizar a preferência no PDI.'); return; }
      window.dispatchEvent(new Event('9fit:profile-updated'));
    });
  };
  return {level,setLevel:change};
}
