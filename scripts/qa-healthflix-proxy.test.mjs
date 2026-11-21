import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../supabase/functions/healthflix-proxy/index.ts',import.meta.url),'utf8');
const compiled = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;$/gm,'');
function fixture() {
  const calls=[]; let handler;
  const db={auth:{getClaims:async()=>({data:{claims:{sub:'user-test',email:'test@example.test'}},error:null})},rpc:async name=>({data:name==='fn_current_athlete_id'?'athlete-own':null}),from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='profiles'?{role:'student',is_active:true}:{status:'active',secret_ref:null},error:null})})})})};
  const sandbox={Response,Request,URL,URLSearchParams,AbortSignal,console,createClient:()=>db,connectorSecret:async()=>null,withPaidAccess:fn=>fn,Deno:{env:{get:key=>key==='HEALTHFLIX_API_KEY'?'test-key':'test-env'},serve:fn=>{handler=fn;}},fetch:async(url,init)=>{calls.push({url,init});return Response.json({ok:true,hero:null,rows:[]});}};
  vm.runInNewContext(compiled,sandbox);
  return {calls,request:(path,init={})=>handler(new Request(`https://proxy.test/?${path}`,{...init,headers:{Authorization:'Bearer test-session',...init.headers}}))};
}
test('home proxy uses authenticated athlete, validates PDI and keeps API key server-side',async()=>{
  const f=fixture(); const response=await f.request('action=content&view=home&fitpro_student_id=other&goal=hipertrofia&level=avancado&minutes=30');
  assert.equal(response.status,200); const url=new URL(f.calls[0].url);
  assert.equal(url.searchParams.get('fitpro_student_id'),'athlete-own');
  assert.equal(url.searchParams.get('view'),'home');assert.equal(url.searchParams.get('minutes'),'30');
  assert.equal(f.calls[0].init.headers['x-api-key'],'test-key');
  assert.equal((await response.text()).includes('test-key'),false);
});
test('legacy list URL is unchanged and invalid PDI values are omitted',async()=>{
  const f=fixture();await f.request('action=content');assert.equal(f.calls[0].url.endsWith('/fitpro-content'),true);
  await f.request('action=content&view=home&goal=unknown&level=expert&minutes=-5');const url=new URL(f.calls[1].url);
  for(const key of ['goal','level','minutes'])assert.equal(url.searchParams.has(key),false);
});
test('play content ID reaches student context with server-resolved identity',async()=>{
  const f=fixture(); const response=await f.request('action=context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content_id:'catalog-4020'})});
  assert.equal(response.status,200);const call=f.calls.find(call=>call.url.endsWith('/fitpro-student-context'));
  const body=JSON.parse(call.init.body);assert.equal(body.content_id,'catalog-4020');assert.equal(body.view,'workout');assert.equal(body.fitpro_student_id,'athlete-own');
});
test('student context refuses a different requested athlete',async()=>{
  const f=fixture();const response=await f.request('action=context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fitpro_student_id:'other',content_id:'1'})});
  assert.equal(response.status,403);assert.equal(f.calls.length,0);
});
