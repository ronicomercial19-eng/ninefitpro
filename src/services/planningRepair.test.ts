import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRemotePlanning } from '../../supabase/functions/_shared/planningContract';
import { goalMetric } from './assessmentMetrics';
import { readFileSync } from 'node:fs';

test('plano remoto precisa de identidade, duração explícita e semana válida',()=>{
 const p=normalizeRemotePlanning({data:{id:'p1',total_weeks:12,current_week:2,waves:[{start_week:1,end_week:4}]}});
 assert.equal(p.weeks,12);assert.equal(p.current,2);
 for(const invalid of [{ok:false},{id:'a',waves:[{}]},{id:'a',total_weeks:12,current_week:13},{id:'a',total_weeks:12,waves:[null]},{id:'a',total_weeks:12,status:'draft'},{id:'a',total_weeks:12,macrocycles:[{weeks:8}]}]) assert.throws(()=>normalizeRemotePlanning(invalid));
 const raw={id:'empty',total_weeks:12,macrocycles:[]};
 assert.equal(normalizeRemotePlanning(raw).payload.macrocycles,undefined);assert.deepEqual(raw.macrocycles,[]);
 const snapshot={snapshot:{smartperiodizer_periodization_id:'annual-1',status:'active',cycle_week:2,payload:{macrocycles:[{weeks:12}],mesocycles:[{weeks:4},{weeks:8}],ondas:[{start_week:1,end_week:4}]}}};
 assert.equal(normalizeRemotePlanning(snapshot).weeks,12);
 assert.equal(normalizeRemotePlanning(snapshot).id,'annual-1');
});
test('força exige teste identificado e distância não promete projeção de avaliação',()=>{
 assert.equal(goalMetric({metrica:'carga',exercicio:null,unidade:'kg'}),null);
 assert.equal(goalMetric({metrica:'carga',exercicio:'supino',unidade:'kg'})?.key,'rm1_empurrar_superior');
 assert.equal(goalMetric({metrica:'distancia',exercicio:null,unidade:'km'}),null);
 assert.equal(goalMetric({metrica:'peso',exercicio:null,unidade:'%'}),null);
});
test('sincronização só aceita persistência verificada e não usa dois caminhos',()=>{
 const page=readFileSync('src/pages/9fit/Planejamento.tsx','utf8');
 assert.match(page,/data\?\.verified !== true/);
 assert.doesNotMatch(page,/smartPeriodizerRequest|fallbackError/);
 const edge=readFileSync('supabase/functions/smartperiodizer-sync/index.ts','utf8');
 assert.match(edge,/visible\?\.plan_id !== saved.id/);
 assert.match(edge,/v1\/fitpro\/planejamento\?fitpro_student_id=/);
 assert.match(edge,/"x-api-key": partnerKey/);
 assert.doesNotMatch(edge,/\/plan\?athlete=/);
 assert.match(edge,/mode: 'canonical_refresh'/);
});
test('snapshot usa coluna real e informa erro; curva não mistura variações por substring',()=>{
 const agent=readFileSync('src/services/training/trainingAgent.ts','utf8');
 assert.match(agent,/context: \{ type: 'training_adjustment'/);assert.match(agent,/if \(error\) throw error/);
 const curve=readFileSync('src/services/training/loadProgression.ts','utf8');
 assert.doesNotMatch(curve,/\.ilike\(/);assert.match(curve,/workout_date/);
});
