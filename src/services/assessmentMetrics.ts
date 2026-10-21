import type { AssessmentRow, HubGoal, ReferenceBand, Trust } from './assessmentHubService';
export const pillars = [ ['forca','Força'], ['resistencia','Resistência'], ['core','Core'], ['cardio','Cardio'], ['mobilidade','Mobilidade'] ] as const;
export type Pillar = typeof pillars[number][0] | 'composicao';
export interface Metric { key: string; label: string; unit: string; pillar: Pillar; trust?: Trust; higher?: boolean }
export const assessmentMetrics: Metric[] = [
  ...[['peso','Peso','kg'],['altura','Altura','cm'],['imc','IMC','kg/m²'],['gordura_corporal','Gordura corporal','%'],['massa_muscular','Massa muscular','kg'],['massa_magra','Massa magra','kg'],['massa_gorda','Massa gorda','kg'],['agua_corporal','Água corporal','%'],['taxa_metabolica','Taxa metabólica','kcal']].map(([key,label,unit])=>({key,label,unit,pillar:'composicao' as const})),
  ...[['circunferencia_braco','Braço'],['circunferencia_peitoral','Peitoral'],['circunferencia_cintura','Cintura'],['circunferencia_quadril','Quadril'],['circunferencia_coxa','Coxa'],['circunferencia_panturrilha','Panturrilha']].map(([key,label])=>({key,label:`Circunferência · ${label}`,unit:'cm',pillar:'composicao' as const})),
  ...[['dobra_triceps','Tríceps'],['dobra_peitoral','Peitoral'],['dobra_abdominal','Abdominal'],['dobra_suprailiaca','Suprailíaca'],['dobra_coxa','Coxa'],['dobra_panturrilha','Panturrilha'],['dobra_subescapular','Subescapular'],['dobra_axilar_media','Axilar média']].map(([key,label])=>({key,label:`Dobra · ${label}`,unit:'mm',pillar:'composicao' as const})),
  {key:'rm1_empurrar_superior',label:'Supino · 1RM',unit:'kg',pillar:'forca',higher:true},
  {key:'rm1_empurrar_perna',label:'Empurrar perna · 1RM',unit:'kg',pillar:'forca',higher:true},
  {key:'rm1_puxar_costas',label:'Puxada / remada · 1RM',unit:'kg',pillar:'forca',higher:true},
  {key:'rm1_puxar_inferior',label:'Puxar inferior · 1RM',unit:'kg',pillar:'forca',higher:true},
  ...[['rml_abs','Abdominais'],['rml_flexao','Flexões'],['rml_agachamento','Agachamentos'],['rml_pull','Barra fixa'],['rml_elevacao_p','Elevação pélvica']].map(([key,label])=>({key,label,unit:'reps',pillar:'resistencia' as const,higher:true})),
  ...[['core_prancha_seg','Prancha'],['core_side_plank_esq_seg','Prancha lateral esquerda'],['core_side_plank_dir_seg','Prancha lateral direita']].map(([key,label])=>({key,label,unit:'s',pillar:'core' as const,higher:true})),
  {key:'cardio_bpm_repouso',label:'Frequência cardíaca de repouso',unit:'bpm',pillar:'cardio'},
  {key:'cardio_bpm_max',label:'Frequência cardíaca máxima',unit:'bpm',pillar:'cardio'},
  {key:'cardio_sprint_vel',label:'Velocidade no sprint',unit:'km/h',pillar:'cardio',higher:true},
  {key:'vo2_estimado',label:'VO₂ máximo estimado',unit:'ml/kg/min',pillar:'cardio',trust:'ESTIMADO'},
  {key:'fc_recuperacao_1min',label:'Recuperação em 1 minuto',unit:'bpm',pillar:'cardio'},
  ...[['mob_overhead_squat','Overhead squat'],['mob_quadril','Mobilidade de quadril'],['mob_tornozelo','Mobilidade de tornozelo'],['mob_ombro','Mobilidade de ombro']].map(([key,label])=>({key,label,unit:'pts',pillar:'mobilidade' as const,higher:true})),
  {key:'gordura_bioimpedancia',label:'Gordura por bioimpedância',unit:'%',pillar:'composicao',trust:'DERIVADO'},
];
export function extra(row: AssessmentRow): Record<string, unknown> { return row.dados_adicionais && typeof row.dados_adicionais==='object' && !Array.isArray(row.dados_adicionais) ? row.dados_adicionais as Record<string,unknown> : {}; }
export function metricValue(row: AssessmentRow | null | undefined,key:string): number | null {
  if (!row) return null;
  const raw=(row as unknown as Record<string,unknown>)[key] ?? extra(row)[key];
  return raw===null || raw===undefined || raw==='' || !Number.isFinite(Number(raw)) ? null : Number(raw);
}
export function trustFor(row:AssessmentRow,metric:Metric):Trust {
  if(metricValue(row,metric.key)===null) return 'NAO_DISPONIVEL';
  if(metric.key==='vo2_estimado') return 'ESTIMADO';
  const confidence=extra(row).confianca as Record<string,Trust>|undefined;
  if(confidence?.[metric.key]) return ['CONFIRMADO','DERIVADO','ESTIMADO','NAO_DISPONIVEL'].includes(confidence[metric.key]) ? confidence[metric.key] : 'NAO_DISPONIVEL';
  if(metric.trust) return metric.trust;
  if(['imc','massa_magra','massa_gorda'].includes(metric.key)) return 'DERIVADO';
  if(metric.key==='gordura_corporal' && extra(row).metodo_gordura_score==='dobras') return 'DERIVADO';
  return 'CONFIRMADO';
}
export const isSelf = (row:AssessmentRow) => ['avaliacao_guiada','peso_avulso','autoavaliacao'].includes(row.origem || '');
export const officialRows=(rows:AssessmentRow[])=>rows.filter(r=>r.oficial);
export const fmt=(n:number,digits=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:digits}).format(n);
export const fullDate=(s:string)=>new Date(`${s.slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR');
export function referenceFor(row:AssessmentRow,metric:Metric,refs:ReferenceBand[]) {
  const protocol=extra(row).protocolo as string|undefined;
  const value=metricValue(row,metric.key);
  if(value===null || !protocol) return null;
  const ref=refs.find(r=>r.teste===metric.key && r.protocolo===protocol && r.unidade===metric.unit);
  const band=ref?.limites.find(b=>(b.min==null || value>=b.min)&&(b.max==null||value<b.max));
  return band && ref ? {label:band.rotulo,source:ref.fonte,protocol:ref.protocolo}:null;
}
export function compareRow(rows:AssessmentRow[],current:AssessmentRow,compare:'primeira'|'anterior') {
  const previous=rows.filter(r=>r.id!==current.id && r.data_avaliacao<=current.data_avaliacao && (current.oficial?r.oficial:r.origem===current.origem));
  return compare==='primeira'?previous[0]??null:previous.at(-1)??null;
}
export function metricRecord(row:AssessmentRow,metric:Metric,history:AssessmentRow[]) {
  const value=metricValue(row,metric.key);
  if(!row.oficial || !metric.higher || value===null || !['CONFIRMADO','DERIVADO'].includes(trustFor(row,metric))) return false;
  const values=history.filter(r=>r.oficial && r.id!==row.id && r.data_avaliacao<row.data_avaliacao && trustFor(r,metric)!=='ESTIMADO').flatMap(r=>{const v=metricValue(r,metric.key);return v===null?[]:[v]});
  return values.length>0 && value>Math.max(...values);
}
export function goalHistory(goal:HubGoal,rows:AssessmentRow[]) {
  const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const aliases:Record<string,string>={supino:'rm1_empurrar_superior',agachamento:'rm1_empurrar_perna',puxada:'rm1_puxar_costas',gordura:'gordura_corporal',peso:'peso'};
  const label=norm(`${goal.metrica} ${goal.exercicio||''}`);
  const metric=assessmentMetrics.find(m=>m.key===goal.metrica)??assessmentMetrics.find(m=>m.key===Object.entries(aliases).find(([word])=>label.includes(word))?.[1]);
  const daily=new Map<string,number>();
  if(!metric || metric.unit !== goal.unidade) return [];
  const eligible=rows.filter(r=>r.oficial && !isSelf(r) && ['CONFIRMADO','DERIVADO'].includes(trustFor(r,metric)) && metricValue(r,metric.key)!==null).sort((a,b)=>a.data_avaliacao.localeCompare(b.data_avaliacao));
  const latest=eligible.at(-1);
  if(!latest) return [];
  eligible.filter(r=>extra(r).protocolo===extra(latest).protocolo && (metric.key!=='gordura_corporal' || extra(r).metodo_gordura_score===extra(latest).metodo_gordura_score)).forEach(r=>{daily.set(r.data_avaliacao.slice(0,10),metricValue(r,metric.key)!)});
  return [...daily].sort(([a],[b])=>a.localeCompare(b)).map(([date,value])=>({date,value}));
}
export function goalProjection(goal:HubGoal,rows:AssessmentRow[]) {
  const points=goalHistory(goal,rows).map(({date,value})=>({x:new Date(`${date}T12:00:00Z`).getTime()/86400000,y:value}));
  if(points.length<4) return {count:points.length,estimate:null};
  const base=points[0].x;const p=points.map(v=>({x:v.x-base,y:v.y}));const n=p.length,mx=p.reduce((s,v)=>s+v.x,0)/n,my=p.reduce((s,v)=>s+v.y,0)/n;
  const sxx=p.reduce((s,v)=>s+(v.x-mx)**2,0);if(!sxx)return {count:n,estimate:null};
  const slope=p.reduce((s,v)=>s+(v.x-mx)*(v.y-my),0)/sxx,intercept=my-slope*mx;
  if(!slope || (goal.valor_meta-p.at(-1)!.y)*slope<=0)return {count:n,estimate:null};
  const target=(goal.valor_meta-intercept)/slope,days=target-p.at(-1)!.x;
  if(days<=0 || days>730)return {count:n,estimate:null};
  const se=Math.sqrt(p.reduce((s,v)=>s+(v.y-intercept-slope*v.x)**2,0)/(n-2));
  const margin=Math.max(7,Math.ceil(2*se*Math.sqrt(1+1/n+(target-mx)**2/sxx)/Math.abs(slope)));
  const day=(d:number)=>new Date((base+d)*86400000).toISOString().slice(0,10);
  return {count:n,estimate:{date:day(target),from:day(Math.max(p.at(-1)!.x,target-margin)),to:day(target+margin)}};
}
