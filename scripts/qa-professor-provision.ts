import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canProvisionAthlete } from '../supabase/functions/_shared/provisionAthleteGuard.ts';
const athlete={coach_id:'coach-a',user_id:null,email:'student@example.invalid'};
test('only active staff responsible for the athlete may provision access',()=>{
  assert.equal(canProvisionAthlete('coach-a','professor',true,athlete,athlete.email),true);
  assert.equal(canProvisionAthlete('coach-b','trainer',true,athlete,athlete.email),false);
  assert.equal(canProvisionAthlete('coach-a','student',true,athlete,athlete.email),false);
  assert.equal(canProvisionAthlete('coach-a','professor',false,athlete,athlete.email),false);
});
test('provisioning never reassigns an existing account or changes the target email',()=>{
  assert.equal(canProvisionAthlete('coach-a','professor',true,{...athlete,user_id:'existing'},athlete.email),false);
  assert.equal(canProvisionAthlete('coach-a','professor',true,athlete,'another@example.invalid'),false);
  assert.equal(canProvisionAthlete('coach-a','professor',true,null,athlete.email),false);
});
test('administrator can provision an unlinked athlete with matching email',()=>{
  assert.equal(canProvisionAthlete('admin','admin',true,athlete,' STUDENT@example.invalid '),true);
  assert.equal(canProvisionAthlete('admin','admin',true,{...athlete,user_id:'existing'},athlete.email),false);
});
