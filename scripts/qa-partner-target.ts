import {test} from 'node:test';
import assert from 'node:assert/strict';
import {partnerTarget} from '../supabase/functions/_shared/partnerTarget.ts';
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
test('query and payload select the same athlete',()=>{
  assert.equal(partnerTarget(`?fitpro_student_id=${a}`,{fitpro_student_id:a}),a);
  assert.equal(partnerTarget('',{athlete_id:a}),a);
  assert.equal(partnerTarget('',undefined),null);
});
test('conflicting nested or repeated identifiers cannot bypass authorization',()=>{
  assert.throws(()=>partnerTarget(`?fitpro_student_id=${a}&fitpro_student_id=${b}`,undefined));
  assert.throws(()=>partnerTarget(`?fitpro_student_id=${a}`,{data:{athlete_id:b}}));
  assert.throws(()=>partnerTarget('',{fitpro_student_id:['invalid']}));
  assert.throws(()=>partnerTarget('?fitpro_student_id=invalid',undefined));
});

test('SmartTreino provider identifier is authorized including nested and conflicting aliases',()=>{
  assert.equal(partnerTarget(`?student_external_id=${a}`,undefined),a);
  assert.equal(partnerTarget('',{student_external_id:a,fitpro_student_id:a}),a);
  assert.throws(()=>partnerTarget(`?fitpro_student_id=${a}`,{student_external_id:b}));
  assert.throws(()=>partnerTarget('',{data:{student_external_id:b},athlete_id:a}));
});
