import assert from 'node:assert/strict';
import { syncConfirmedCommitment,removeCalendarCommitment } from '../src/services/googleCalendar';
const originalFetch=globalThis.fetch;
const id='12345678-1234-1234-1234-123456789abc',eventId='9fit12345678123412341234123456789abc';
const event={summary:'Sessão',startDateTime:'2026-10-05T12:00:00Z',endDateTime:'2026-10-05T13:00:00Z'};
async function main(){
  const calls:Array<{url:string;method:string;body:any}>=[];let exists=false;
  globalThis.fetch=async(input,init)=>{
    const url=String(input),method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):null;calls.push({url,method,body});
    if(method==='GET')return new Response(exists?JSON.stringify({id:eventId}):null,{status:exists?200:404});
    exists=true;return new Response(JSON.stringify({id:eventId}),{status:200});
  };
  assert.equal((await syncConfirmedCommitment('test-token',id,event)).id,eventId);
  await syncConfirmedCommitment('test-token',id,{...event,summary:'Sessão atualizada'});
  assert.deepEqual(calls.map(c=>c.method),['GET','POST','GET','PATCH']);
  assert.equal(calls[1].body.id,eventId);assert.ok(calls[3].url.endsWith(eventId));
  assert.equal(calls[3].body.summary,'Sessão atualizada');
  let mutation=false;
  globalThis.fetch=async(_input,init)=>{if(init?.method)mutation=true;return new Response(null,{status:401});};
  await assert.rejects(syncConfirmedCommitment('expired',id,event),/Reconecte/);assert.equal(mutation,false);
  const raceMethods:string[]=[];
  globalThis.fetch=async(_input,init)=>{const method=init?.method??'GET';raceMethods.push(method);return new Response(method==='PATCH'?JSON.stringify({id:eventId}):null,{status:method==='GET'?404:method==='POST'?409:200});};
  await syncConfirmedCommitment('test-token',id,event);assert.deepEqual(raceMethods,['GET','POST','PATCH']);
  globalThis.fetch=async()=>new Response(null,{status:404});await removeCalendarCommitment('test-token',eventId);
  await assert.rejects(syncConfirmedCommitment('test-token','------------------------------------',event),/inválido/);
  console.log('Commitment calendar passed: deterministic IDs, retry updates, concurrent conflict recovery, expired auth, safe cancellation and input validation.');
}
main().finally(()=>{globalThis.fetch=originalFetch;});
