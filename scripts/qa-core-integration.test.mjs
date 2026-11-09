import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { makeCoreClient, coreConfig, signedHeaders, phoneBR, CORE_BASE } from "../supabase/functions/_shared/coreClient.ts";
import { createCoreIntegration } from "../supabase/functions/_shared/coreIntegration.ts";
const env = key => ({NINEZAP_SHARED_SECRET:"test-shared-secret"}[key]);
const token = "a".repeat(64);
const request = (action, body = {}, headers = {}) => new Request("https://example.test?action=" + action, {method:"POST",headers:{"x-core-worker-token":token,...headers},body:JSON.stringify(body)});
function mockDb({queue = [], failIngest = false, admin = false} = {}) {
  const calls = [], writes = [];
  const db = {
    calls, writes,
    async rpc(name,args) {
      calls.push({name,args});
      if(name==="fn_core_worker_key")return {data:token};
      if(name==="has_role")return {data:admin};
      if(name==="fn_core_worker_lock")return {data:true};
      if(name==="fn_core_claim_events")return {data:queue};
      if(name==="fn_core_ingest_page")return failIngest ? {error:{message:"failure"}} : {data:0};
      return {data:null};
    },
    from(table) {
      const chain = {select(){return this},eq(){return this},in(){return this},lte(){return this},order(){return this},limit(){return this},
        update(value){writes.push({table,value});return this},
        single:async()=>({data:{after_at:"2026-11-09T13:00:00Z",after_id:null}}),
        then(resolve){return Promise.resolve({data:[]}).then(resolve)}};
      return chain;
    }
  };
  return db;
}
test("HMAC signs exact POST bytes and query with question mark",async()=>{
  const seen = [];
  const fetcher = async(url,init)=>{
    const material=init.method==="POST"?init.body:new URL(url).search;
    assert.equal(init.headers["x-zap-signature"],createHmac("sha256","test-shared-secret").update(init.headers["x-zap-timestamp"]+"."+material).digest("hex"));
    assert.equal(init.redirect,"error");
    seen.push({url,body:init.body});
    return Response.json({ok:true});
  };
  const core = makeCoreClient(coreConfig(env),fetcher);
  await core("core-events","/api/public/events","POST",{type:"fitpro.signup",payload:{name:"José"}});
  await core("core-events","/api/public/events/outbox?after=2026-11-09T13%3A00%3A00Z&limit=100");
  assert.equal(seen[0].body,JSON.stringify({type:"fitpro.signup",payload:{name:"José"}}));
  assert.match(seen[1].url,/after=2026/);
  assert.equal((await signedHeaders("s","fitpro","","123"))["x-zap-timestamp"],"123");
});
test("rejects foreign origin and tenant before sending secrets",()=>{
  assert.throws(()=>coreConfig(k=>({NINEZAP_BASE_URL:"https://wrong.lovable.app",NINEZAP_SHARED_SECRET:"s"}[k])),/core_origin_invalid/);
  assert.throws(()=>coreConfig(k=>({NINEZAP_TENANT:"other",NINEZAP_SHARED_SECRET:"s"}[k])),/tenant_invalid/);
  assert.throws(()=>coreConfig(()=>undefined),/shared_secret_missing/);
  assert.equal(coreConfig(env).base,CORE_BASE);
  assert.equal(phoneBR("(11) 99999-0000"),"+5511999990000");
  assert.equal(phoneBR("invalid"),null);
});
test("health is internal or admin only and returns no credentials",async()=>{
  const db=mockDb();
  const handler=createCoreIntegration({db,env,currentUser:async()=>null,fetcher:async()=>Response.json({ok:true,types:[{type:"fitpro.signup"}]})});
  const response=await handler(request("health"));
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{status:200,event_count:1});
  const denied=await handler(new Request("https://example.test?action=health"));
  assert.equal(denied.status,401);
});
test("ordinary logged-in user cannot invoke administration",async()=>{
  const db=mockDb();
  const handler=createCoreIntegration({db,env,currentUser:async()=>"user",fetcher:()=>{throw Error("must not fetch")}});
  const r=await handler(new Request("https://example.test?action=health",{headers:{authorization:"Bearer session"}}));
  assert.equal(r.status,403);
});
test("signature failure halts before queue claim and never returns upstream body",async()=>{
  const db=mockDb();
  const handler=createCoreIntegration({db,env,currentUser:async()=>null,fetcher:async()=>new Response("sensitive error",{status:401})});
  const response=await handler(request("run"));
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{status:401,error:"core_http_401"});
  assert.equal(db.calls.some(c=>c.name==="fn_core_claim_events"),false);
});
test("unsupported events are retained as blocked, without fabricating consumers",async()=>{
  const db=mockDb({queue:[{id:"job",event_type:"unknown.event",attempts:1}]});
  const handler=createCoreIntegration({db,env,currentUser:async()=>null,fetcher:async url=>Response.json(
    url.includes("/types")?{ok:true,types:[]}:{ok:true,events:[],next_after:"2026-11-09T13:01:00Z",next_after_id:"00000000-0000-0000-0000-000000000001"})});
  const r=await handler(request("run"));
  assert.equal(r.status,200);
  assert.equal((await r.json()).outgoing.blocked,1);
  assert.equal(db.writes.some(w=>w.table==="core_event_queue"&&w.value.state==="blocked"),true);
  const page=db.calls.find(c=>c.name==="fn_core_ingest_page");
  assert.equal(page.args.p_after_id,"00000000-0000-0000-0000-000000000001");
  assert.equal(db.calls.some(c=>c.name==="fn_core_worker_unlock"),true);
});
test("failed durable inbox write aborts and releases worker lock",async()=>{
  const db=mockDb({failIngest:true});
  const handler=createCoreIntegration({db,env,currentUser:async()=>null,fetcher:async url=>Response.json(
    url.includes("/types")?{ok:true,types:[]}:{ok:true,events:[],next_after:"2026-11-09T13:01:00Z"})});
  const r=await handler(request("run"));
  assert.equal(r.status,503);
  assert.equal(db.calls.filter(c=>c.name==="fn_core_ingest_page").length,1);
  assert.equal(db.calls.some(c=>c.name==="fn_core_worker_unlock"),true);
  assert.equal(db.writes.some(w=>w.value.after_at),false);
});

