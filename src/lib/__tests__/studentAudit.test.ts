import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consecutiveDays } from '../studentDates';
import { parseDailyContext } from '../dailyContextContract';
import { validateRonActions, decodeRonChat } from '../../../supabase/functions/_shared/ronActionContract';
import { safeExternalAppUrl } from '../externalApps';

test('streak continues from yesterday but never bridges gaps or counts duplicates', () => {
 assert.equal(consecutiveDays(['2026-10-23','2026-10-22','2026-10-20','2026-10-22'],'2026-10-23'),2);
 assert.equal(consecutiveDays(['2026-10-22','2026-10-21'],'2026-10-23'),2);
 assert.equal(consecutiveDays(['2026-10-21'],'2026-10-23'),0);
 assert.equal(consecutiveDays(['2026-03-01','2026-02-28'],'2026-03-01'),2);
});
const context=()=>({version:3,status:'available',date:'2026-10-23',profile:{complete:false,declared:{},preferences:{},inferred:{},observed:{active_days_30d:0,completed_workouts_30d:0,nutrition_days_30d:0,hydration_days_30d:0,review_days_30d:0,training_windows:[]}},calibration:{complete:false},safety:{review_required:false},today:{workout_completed:false,workout_in_progress:false,workout_scheduled:false,rest_day:false,meals:0,water_ml:0},streak:0,sync:{value:null,coverage_dimensions:{}}});
test('both cache entry paths accept v3 without fabricating missing observations',()=>{
 assert.equal(parseDailyContext(context()).version,3);
 const incomplete=context();delete (incomplete.profile.observed as any).hydration_days_30d;
 assert.throws(()=>parseDailyContext(incomplete));
 assert.throws(()=>parseDailyContext({...context(),version:4}));
 assert.throws(()=>parseDailyContext({...context(),sync:{value:101,coverage_dimensions:{}}}));
});
test('RON requires explicit valid values, strips identity, and cannot auto-execute',()=>{
 const actions=validateRonActions([{type:'LOG_WATER',title:'Registrar',autoExecute:true,payload:{amountMl:250,athlete_id:'another-user'}},{type:'LOG_WATER',title:'Inválido',payload:{amountMl:-10}},{type:'NAVIGATE',title:'Externo',payload:{path:'https://example.com'}}]);
 assert.equal(actions.length,1);assert.equal(actions[0].autoExecute,false);assert.deepEqual(actions[0].payload,{amountMl:250});
 assert.deepEqual(validateRonActions([{type:'LOG_NUTRITION',title:'Almoço',payload:{mealName:'Arroz'}}]),[]);
 assert.deepEqual(decodeRonChat('Mensagem sem JSON'),{content:'Mensagem sem JSON',actions:[]});
});
test('external apps use known HTTPS destinations and never forward URL credentials',()=>{
 assert.equal(safeExternalAppUrl('https://ninefoodss.lovable.app/?token=secret&view=home#access_token=secret'),'https://ninefoodss.lovable.app/?view=home');
 for(const value of ['javascript:alert(1)','https://attacker.lovable.app','https://ninefoodss.lovable.app.attacker.test','https://user:password@ninefoodss.lovable.app'])assert.equal(safeExternalAppUrl(value),null);
 assert.equal(safeExternalAppUrl('https://fit-community.9fit.com/'),'https://fit-community.9fit.com/');
});
