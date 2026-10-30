type Dose = { reps?: string | number; reps_range?: string | number; notes?: string };
export function formatWorkoutDose(exercise: Dose): string {
  const raw = String(exercise.reps ?? exercise.reps_range ?? '').trim();
  const seconds = exercise.notes?.match(/isometr[^+]*?\b(\d+(?:[.,]\d+)?)\s*(?:s\b|seg)/i)?.[1];
  if (seconds && (!raw || raw === '1')) return `Isometria ${seconds} s`;
  if (!raw) return 'Dose a confirmar';
  return raw.replace(/(\d)\s*(?:segundos?|seg|s)\b/gi,'$1 s').replace(/\s*\/\s*lado\b/gi,' por lado').replace(/\b(cada lado)\b/gi,'por lado');
}
/** Duration per set is read only from an explicit time dose. */
export function prescribedDoseSeconds(value: unknown): number | null {
 const match=String(value??'').trim().toLowerCase().match(/^(\d+)(?:-(\d+))?\s*(s|seg|segundos?|min|minutos?)$/);
 if(!match)return null;
 const low=Number(match[1]),high=Number(match[2]??match[1]);
 if(low<=0||high<low)return null;
 return (low+high)/2*(match[3].startsWith('min')?60:1);
}
export function estimateWorkoutMinutes(exercises:Array<{sets?:unknown;reps?:unknown;reps_range?:unknown;rest_seconds?:unknown}>,preparationMinutes=3):number|undefined {
 if(!exercises.length)return undefined;
 const seconds=exercises.reduce((sum,e)=>{
  const sets=Math.max(1,Number(e.sets)||3);
  const rest=e.rest_seconds==null?60:Math.max(0,Number(e.rest_seconds)||0);
  return sum+sets*(prescribedDoseSeconds(e.reps??e.reps_range)??40)+(sets-1)*rest+30;
 },0);
 return Math.max(1,Math.ceil(seconds/60+preparationMinutes));
}
