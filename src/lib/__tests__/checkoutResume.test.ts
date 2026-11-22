import test from 'node:test';
import assert from 'node:assert/strict';
import {planDestination,setupDestination} from '../customerEntry';
test('a selected purchase resumes checkout after account verification without selecting the plan again',()=>{
 const destination=setupDestination({roleHome:'/9fit/hub',firstAccessDone:false,googleIdentity:false,athleteId:null,activationDone:false,profileDone:false,intent:'purchase',access:false});
 assert.equal(planDestination(destination,'annual'),'/9fit/checkout/annual');
 assert.equal(planDestination(destination,'basic'),'/9fit/checkout/basic');
 assert.equal(planDestination(destination,null),'/9fit/planos');
});
test('a remembered plan never overrides professional, active-access or onboarding destinations',()=>{
 for(const destination of ['/app','/9fit/os','/9fit/ativacao','/9fit/first-access']) assert.equal(planDestination(destination,'annual'),destination);
});
