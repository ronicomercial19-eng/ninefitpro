import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregatePlanningSessions, planningTopic, planningWeeks, rangeMidpoint } from './planningModel';

test('normalizes weeks and duration_weeks without dropping the annual map',()=>{
 const model=planningWeeks([{name:'Base',duration_weeks:12},{name:'Força',weeks:12}],[],14);
 assert.equal(model.weeks.length,24);assert.equal(model.cur,14);assert.equal(model.weeks[13].mi,1);
});
test('wave intervals populate every week; absent trailing prescriptions remain absent',()=>{
 const model=planningWeeks([{name:'Base',weeks:8}],[{start_week:1,end_week:4,volume:'Séries 8-12',intensity:'RPE 7-8',status:'current',pct:99}],4);
 assert.equal(model.cur,4);assert.equal(model.weeks[3].vol,10);assert.equal(model.weeks[3].rpe,7.5);
 assert.equal(model.weeks[4].vol,null);assert.equal(model.hasVol,true);assert.equal(model.hasRpe,true);
});
test('legacy wave week and missing data do not create example metrics',()=>{
 const model=planningWeeks([{name:'Base',weeks:4}],[{week:2,volume:'Séries 12'}],999);
 assert.equal(model.weeks[0].vol,null);assert.equal(model.weeks[1].vol,12);assert.equal(model.hasVol,false);assert.equal(model.hasRpe,false);assert.equal(model.cur,4);
 assert.deepEqual(planningWeeks([],[],1).weeks,[]);assert.equal(rangeMidpoint(''),null);assert.equal(rangeMidpoint('RPE 7,5–8,5'),8);
});
test('same-day sessions are all counted and volumes/durations summed with duration-weighted RPE',()=>{
 const day=aggregatePlanningSessions([
 {workout_date:'2026-10-21',avg_rpe:6,total_volume_kg:1000,duration_minutes:20},
 {workout_date:'2026-10-21',rpe:9,total_volume_kg:2000,duration_minutes:40},
 ])['2026-10-21'];
 assert.deepEqual(day,{count:2,vol:3000,min:60,rpe:8});
});
test('missing measures stay null and invalid effort is excluded',()=>{
 const day=aggregatePlanningSessions([{workout_date:'2026-10-21',avg_rpe:99},{workout_date:'2026-10-21'}])['2026-10-21'];
 assert.deepEqual(day,{count:2,rpe:null,vol:null,min:null});
 assert.deepEqual(aggregatePlanningSessions([]),{});
});
test('RON topic stays short single-line plain text',()=>{
 assert.equal(planningTopic('  Volume\r\nhoje  '),'Volume hoje');
 assert.equal(planningTopic('x'.repeat(200)).length,80);
 assert.equal(planningTopic('<script>teste</script>'),'<script>teste</script>');
});
