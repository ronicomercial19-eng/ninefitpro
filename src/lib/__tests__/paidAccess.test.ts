import assert from 'node:assert/strict';import {test} from 'node:test';
import {createAccessGuard} from '../../../supabase/functions/_shared/accessGuard';
import {isAccountRoute,paidAccessAvailable} from '../paidAccess';
test('expiry boundary blocks paid modules while preserving essential account routes',()=>{
 const a={allowed:true,source:'subscription',reason:'active',server_now:'2026-10-28T00:00:00Z',expires_at:'2026-10-29T00:00:00Z'};
 assert.equal(paidAccessAvailable(a,Date.parse(a.expires_at)-1),true);assert.equal(paidAccessAvailable(a,Date.parse(a.expires_at)),false);
 for(const path of ['/9fit/ativacao','/9fit/profile','/9fit/planos','/9fit/acompanhamento','/9fit/progresso'])assert.equal(isAccountRoute(path),true);
 for(const path of ['/9fit/train','/9fit/ron','/9fit/healthflix','/9fit/profile-other'])assert.equal(isAccountRoute(path),false);
});
test('API guard rejects unpaid or unauthenticated requests before invoking expensive handler',async()=>{
 let calls=0;const handler=async()=>{calls++;return new Response('handler')};
 const request=(auth=true)=>new Request('https://test.invalid',{method:'POST',headers:auth?{Authorization:'Bearer user'}:{},body:'{}'});
 assert.equal((await createAccessGuard(handler,{authorize:async()=>({allowed:false})})(request())).status,402);
 assert.equal((await createAccessGuard(handler,{authorize:async()=>null})(request())).status,401);
 assert.equal((await createAccessGuard(handler,{authorize:async()=>({allowed:true})})(request(false))).status,401);assert.equal(calls,0);
});
test('API guard bounds streaming bodies and passes accepted body without mutation',async()=>{
 const guard=createAccessGuard(async req=>new Response(await req.text()),{authorize:async()=>({allowed:true}),maxBodyBytes:8});
 const request=(body:string)=>new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer user'},body});
 assert.equal((await guard(request('too large body'))).status,413);
 const accepted=await guard(request('{"ok":1}'));assert.equal(await accepted.text(),'{"ok":1}');
});
test('paid subscription cannot be used to target another student in nested payload or query',async()=>{
 let calls=0;const guard=createAccessGuard(()=>{calls++;return new Response('ok')},{authorize:async()=>({allowed:true,validateTargets:async ids=>ids.every(id=>id==='own')})});
 const headers={Authorization:'Bearer user'};
 assert.equal((await guard(new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify({payload:{athlete_id:'other'}})}))).status,403);
 assert.equal((await guard(new Request('https://test.invalid?user_id=other',{headers}))).status,403);
 assert.equal((await guard(new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify({student_ids:['own','other']})}))).status,403);
 assert.equal((await guard(new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify({athlete_id:'own'})}))).status,200);
 assert.equal(calls,1);
});
test('rate budget rejects before invoking provider and returns retry guidance',async()=>{
 let calls=0;const guard=createAccessGuard(()=>{calls++;return new Response('provider')},{authorize:async()=>({allowed:true,consumeBudget:async()=>({allowed:false,retry_after:45})})});
 const response=await guard(new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer user'},body:'{}'}));
 assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'45');assert.equal(calls,0);
});
test('preflight supports current client headers without authenticating or invoking provider',async()=>{
 const guard=createAccessGuard(()=>{throw Error('provider called')},{authorize:async()=>{throw Error('auth called')}});
 const response=await guard(new Request('https://test.invalid',{method:'OPTIONS'}));assert.equal(response.status,204);assert.match(response.headers.get('Access-Control-Allow-Headers')||'',/x-supabase-client-platform/);
});
