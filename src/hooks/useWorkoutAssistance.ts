import { useEffect, useState } from 'react';
export const ASSISTANCE_LEVELS = [
  {label:'Solo',desc:'Execução autônoma; RON disponível sob demanda'},
  {label:'Guiado',desc:'Séries, descanso e cadência prescrita'},
  {label:'Assistido',desc:'Orientação contextual do RON e revisão de dificuldades'},
];
export function useWorkoutAssistance(athleteId:string|null){
  const [level,setLevel]=useState(1);
  useEffect(()=>{const read=()=>{try{const value=localStorage.getItem(`9fit:assistance:${athleteId}`);setLevel(value!==null&&['0','1','2'].includes(value)?Number(value):1);}catch{setLevel(1);}};read();const changed=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.athleteId===athleteId&&[0,1,2].includes(detail.level))setLevel(detail.level);else if(!detail)read();};window.addEventListener('9fit:assistance-updated',changed);return()=>window.removeEventListener('9fit:assistance-updated',changed);},[athleteId]);
  const change=(value:number)=>{if(![0,1,2].includes(value))return;setLevel(value);try{if(athleteId)localStorage.setItem(`9fit:assistance:${athleteId}`,String(value));}catch{/* A sessão continua sem armazenamento local. */}window.dispatchEvent(new CustomEvent('9fit:assistance-updated',{detail:{athleteId,level:value}}));};
  return {level,setLevel:change};
}
