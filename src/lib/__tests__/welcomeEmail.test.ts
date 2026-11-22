import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function welcome({role='trainer',key='qa-key',status=200,result={id:'qa-email'}}: {role?:string;key?:string;status?:number;result?:unknown}={}) {
 const sent: Array<{url:string;body:Record<string,unknown>}> = [];
 let handler: (req:Request)=>Promise<Response>;
 const chain={select(){return this;},eq(){return this;},async single(){return {data:{role}};}};
 const context={Request,Response,AbortSignal,Date,console:{log(){},error(){}},Deno:{env:{get:(name:string)=>name==='RESEND_API_KEY'?key:'qa'}},
  serve:(fn:typeof handler)=>{handler=fn;},createClient:()=>({auth:{async getClaims(){return {data:{claims:{sub:'qa-professional'}}};}},from:()=>chain}),
  fetch:async(url:string,init:RequestInit)=>{sent.push({url,body:JSON.parse(init.body as string)});return new Response(JSON.stringify(result),{status});}};
 const source=readFileSync('supabase/functions/send-student-welcome/index.ts','utf8').replace(/^import .*;\r?\n/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
 vm.runInNewContext(js,context);
 const request=(authorized=true)=>handler!(new Request('https://example.invalid',{method:'POST',headers:authorized?{Authorization:'Bearer qa-token'}:{},body:JSON.stringify({studentName:'QA <Aluno>',studentEmail:'qa@example.invalid',password:'qa-temporary'})}));
 return {request,sent};
}
test('welcome email requires authorization and a provider key before any external request',async()=>{
 for(const [config,authorized,status] of [[{},false,401],[{role:'student'},true,403],[{key:''},true,503]] as const){const flow=welcome(config);const response=await flow.request(authorized);assert.equal(response.status,status);assert.equal(flow.sent.length,0);}
});
test('a provider rejection cannot be presented as email sent',async()=>{
 for(const result of [{message:'rejected'},null,{}]){const flow=welcome({status:422,result});const response=await flow.request();assert.equal(response.status,502);assert.equal((await response.json()).success,false);}
});
test('email success requires provider confirmation and keeps the escaped template',async()=>{
 const flow=welcome();const response=await flow.request();assert.equal(response.status,200);assert.equal((await response.json()).data.emailId,'qa-email');assert.equal(flow.sent[0].url,'https://api.resend.com/emails');assert.match(flow.sent[0].body.html as string,/QA &lt;Aluno&gt;/);
});
