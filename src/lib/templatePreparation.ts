import DOMPurify from 'dompurify';
import type {PrescriptionExercise} from '../../supabase/functions/_shared/professorContract';
export type CatalogExercise={id:string;name:string};
export type ModelDay={label:string;exercises:(PrescriptionExercise & {name:string})[]};
export const normalizedExercise=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^\s*\d+[.)-]\s*/,'').replace(/[^a-z0-9]+/g,' ').trim();
export function extractModelDays(html:string,schema:any,catalog:CatalogExercise[]):ModelDay[]{
 const byId=new Map(catalog.map(row=>[row.id,row.name]));
 const prepare=(rows:any[])=>rows.map(row=>({...row,exercise_id:row.exercise_id||'',name:row.name||byId.get(row.exercise_id)||'Exercício sem nome',sets:Number(row.sets)||3,reps_range:String(row.reps_range||row.reps||'8-12'),rest_seconds:Number(row.rest_seconds??60)}));
 if(Array.isArray(schema?.days))return schema.days.map((d:any,i:number)=>({label:d.name||d.day_name||`Dia ${i+1}`,exercises:prepare(d.exercises||[])})).filter((d:ModelDay)=>d.exercises.length);
 if(Array.isArray(schema?.exercises)&&schema.exercises.length)return [{label:'Treino do modelo',exercises:prepare(schema.exercises)}];
 const document=new DOMParser().parseFromString(html,'text/html');
 const groups=new Map<string,ModelDay>();
 const headings=[...document.querySelectorAll('h3,h4,[data-exercise-name]')].filter(el=>/^\s*\d+[.)-]/.test(el.textContent||'')||el.hasAttribute('data-exercise-name'));
 for(const el of headings){
  const name=(el.getAttribute('data-exercise-name')||el.textContent||'').replace(/^\s*\d+[.)-]\s*/,'').trim();
  const text=(el.closest('article,li,tr')||el.parentElement?.parentElement||el.parentElement)?.textContent||'';
  const day=el.closest('[data-day],.tab-content,section');const label=day?.querySelector('h2')?.textContent?.trim()||day?.id||'Treino do modelo';
  const matched=catalog.find(row=>normalizedExercise(row.name)===normalizedExercise(name));
  const dose=text.match(/(\d+)\s*(?:x|×|séries?\s*(?:de)?|vezes\s*(?:de)?)\s*(\d+(?:\s*[-–]\s*\d+)?(?:\s*(?:segundos?|minutos?|s|min))?)/i);
  const rest=text.match(/(?:descanso|intervalo)\D{0,10}(\d+)\s*(?:s|segundos?)/i);
  if(!groups.has(label))groups.set(label,{label,exercises:[]});
  groups.get(label)!.exercises.push({exercise_id:matched?.id||'',name,sets:dose?Number(dose[1]):3,reps_range:dose?.[2]||'8-12',rest_seconds:rest?Number(rest[1]):60,notes:`Do modelo: ${name}. ${text.replace(/\s+/g,' ').slice(0,450)}${!dose||!rest?' · Dose ou descanso não estruturados: valores de rascunho para revisão do professor.':''}`});
 }
 return [...groups.values()];
}
export function personalizedModelHtml(html:string,variables:Record<string,string>,originalName=''){
 const clean=DOMPurify.sanitize(html,{WHOLE_DOCUMENT:true,ADD_TAGS:['style'],FORBID_TAGS:['script','iframe','object','embed','form','base','link']});
 const document=new DOMParser().parseFromString(clean,'text/html');
 const walker=document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);let node:Node|null;
 const literal=originalName.trim()?new RegExp(originalName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'):null;
 while((node=walker.nextNode())){
  if(['STYLE','SCRIPT'].includes(node.parentElement?.tagName||''))continue;
  let text=node.textContent||'';
  for(const [key,value] of Object.entries(variables))text=text.split(`{{${key}}}`).join(value);
  if(literal)text=text.replace(literal,variables.athlete_name||'Atleta');node.textContent=text;
 }
 const style=document.createElement('style');style.textContent='.tab-content{display:block!important;margin-bottom:2rem}';document.head.append(style);
 const header=document.createElement('header');header.style.cssText='padding:16px;border:1px solid #ff7417;margin-bottom:20px';
 const title=document.createElement('h1');title.textContent=variables.athlete_name;
 const goal=document.createElement('p');goal.textContent=`Objetivo: ${variables.goal||'Não informado'}`;
 const pdi=document.createElement('p');pdi.textContent=variables.pdi||'';header.append(title,goal,pdi);document.body.prepend(header);
 return '<!DOCTYPE html>'+document.documentElement.outerHTML;
}
