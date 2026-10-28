// Manual, bounded read-only smoke. Never run automatically in CI or send AI/payment requests.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
if(process.env.QA_RUN_HTTP_SMOKE!=='1')throw Error('Set QA_RUN_HTTP_SMOKE=1 and provide QA_EMAIL/QA_PASSWORD or QA_ACCESS_TOKEN. No requests sent.');
const client=await readFile(new URL('../src/integrations/supabase/client.ts',import.meta.url),'utf8');
const base=client.match(/const SUPABASE_URL = "([^"]+)"/)[1];
const key=client.match(/const SUPABASE_PUBLISHABLE_KEY = "([^"]+)"/)[1];
if(new URL(base).hostname!=='mfrydtrzjxscbkaiwfnw.supabase.co')throw Error('Unexpected credential destination');
const mode=process.env.QA_MODE==='professor'?'professor':'student';
const total=Math.min(120,Math.max(6,Math.trunc(Number(process.env.QA_REQUESTS)||60)));
const concurrency=Math.min(5,Math.max(1,Math.trunc(Number(process.env.QA_CONCURRENCY)||3)));
let token=process.env.QA_ACCESS_TOKEN,createdSession=false;
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*p)-1)];
const cases=mode==='professor' ? [
 {name:'paged_roster',path:'/rest/v1/rpc/fn_coach_students_page',body:{p_offset:0,p_limit:50},valid:x=>Array.isArray(x.students)&&x.students.length<=50},
 {name:'monthly_calendar',path:'/rest/v1/rpc/fn_coach_agenda',body:{p_month:process.env.QA_MONTH||'2026-10-01'},valid:x=>Array.isArray(x.appointments)&&Array.isArray(x.bookings)},
 {name:'student_context',path:'/rest/v1/rpc/fn_coach_student_context',body:{p_athlete_id:process.env.QA_ATHLETE_ID},valid:x=>x.version===1&&Array.isArray(x.workouts)},
] : [
 {name:'own_access',path:'/rest/v1/rpc/fn_fitpro_access_status',body:{},valid:x=>typeof x.allowed==='boolean'},
 {name:'own_notifications',path:'/rest/v1/notifications?select=id&order=created_at.desc&limit=20',valid:x=>Array.isArray(x)&&x.length<=20},
];
if(mode==='professor'&&!/^[0-9a-f-]{36}$/i.test(process.env.QA_ATHLETE_ID||''))throw Error('QA_ATHLETE_ID is required for professional context');
const samples=[];let index=0,active=0,maxActive=0;
try{
 if(!token){
  if(!process.env.QA_EMAIL||!process.env.QA_PASSWORD)throw Error('Missing test account credentials');
  const login=await fetch(base+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({email:process.env.QA_EMAIL,password:process.env.QA_PASSWORD}),signal:AbortSignal.timeout(15000)});
  if(!login.ok)throw Error('Test login rejected: HTTP '+login.status);
  const session=await login.json();token=session.access_token;createdSession=true;
  if(!token)throw Error('Login did not return a session');
 }
 await Promise.all(Array.from({length:Math.min(concurrency,total)},async()=>{
  while(index<total){
   const step=index++,item=cases[step%cases.length],started=performance.now();
   active++;maxActive=Math.max(maxActive,active);
   let status=0,bytes=0,ok=false;
   try{
    const response=await fetch(base+item.path,{method:item.body?'POST':'GET',headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json'},...(item.body?{body:JSON.stringify(item.body)}:{}),signal:AbortSignal.timeout(15000)});
    status=response.status;const text=await response.text();bytes=Buffer.byteLength(text);ok=response.ok&&item.valid(JSON.parse(text));
   }catch{ /* Only aggregate metrics are recorded; never tokens or response data. */ }
   finally{active--;samples.push({name:item.name,status,bytes,ok,ms:Math.round((performance.now()-started)*100)/100});}
  }
 }));
 const report={timestamp:new Date().toISOString(),mode,distinctAccounts:1,requests:total,maxConcurrentRequests:maxActive,readOnly:true,realPaymentsOrAIRequests:0,productionCapacityFor3000ConcurrentUsersProven:false,endpoints:cases.map(item=>{const rows=samples.filter(s=>s.name===item.name),times=rows.map(s=>s.ms);return {name:item.name,samples:rows.length,failures:rows.filter(s=>!s.ok).length,p50_ms:percentile(times,.5),p95_ms:percentile(times,.95),max_ms:Math.max(...times),maxResponseBytes:Math.max(...rows.map(s=>s.bytes)),statuses:[...new Set(rows.map(s=>s.status))]}})};
 if(process.env.QA_REPORT_PATH){await mkdir(dirname(process.env.QA_REPORT_PATH),{recursive:true});await writeFile(process.env.QA_REPORT_PATH,JSON.stringify(report,null,2)+'\n');}
 console.log(JSON.stringify(report));
 if(samples.some(s=>!s.ok))process.exitCode=1;
}finally{
 // Revoke only this smoke session, leaving the user's browser sessions intact.
 if(createdSession&&token){const logout=await fetch(base+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!logout.ok){console.error('Smoke session logout failed: HTTP '+logout.status);process.exitCode=1;}}
}
