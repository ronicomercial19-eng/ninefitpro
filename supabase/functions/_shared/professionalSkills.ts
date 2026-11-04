export type RuntimeSkill = {id:string;slug:string;name:string;version:number;category?:string;description?:string;content?:Record<string,unknown>};
const specialized:Record<string,string>={posturapro:'/app/postura-pro','sensorium':'/app/acompanhamento','9pay':'/app/monetizacao','credit-classes':'/app/agenda','9flix':'/app/healthflix'};
export function skillRoute(skill: Pick<RuntimeSkill,'slug'>) {return specialized[skill.slug] || null;}
export function compileProfessionalSkills(skills:RuntimeSkill[],mode:string,selectedId?:string) {
  const selected=selectedId?skills.filter(row=>row.id===selectedId):skills;
  if(selectedId&&!selected.length)throw new Error('skill_not_active');
  const eligible=selected.filter(skill=>!skillRoute(skill));
  if(selectedId&&!eligible.length)throw new Error('skill_requires_specialized_module');
  const applied=eligible.filter(skill=>mode!=='draft_training'||['daily-protocol','smartperiodizer','ron-realtime','ron-conversational'].includes(skill.slug)||Array.isArray(skill.content?.modes)&&skill.content.modes.includes('draft_training'));
  if(selectedId&&!applied.length)throw new Error('skill_mode_not_supported');
  return {applied,prompt:applied.map(skill=>JSON.stringify({id:skill.id,slug:skill.slug,version:skill.version,mission:skill.description,instructions:skill.content?.instructions,inputs:skill.content?.inputs,outputs:skill.content?.outputs}).slice(0,3000)).join('\n').slice(0,12000)};
}
